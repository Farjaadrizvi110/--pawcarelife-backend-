import type { UploadApiResponse } from "cloudinary";
import { Router } from "express";
import multer from "multer";
import { ARTICLE_IMAGE_FOLDER, cloudinary } from "../config/cloudinary.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const MAX_FILE_BYTES = 6 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

/**
 * Images are buffered in memory rather than written to disk: each one is
 * streamed straight to Cloudinary, which keeps the API stateless and safe to
 * run on ephemeral hosts such as Render or Railway.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new AppError(400, "Only JPEG, PNG, WebP, GIF or AVIF images are allowed"));
      return;
    }
    cb(null, true);
  },
});

function uploadToCloudinary(buffer: Buffer): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: ARTICLE_IMAGE_FOLDER, resource_type: "image" },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary returned no result"));
          return;
        }
        resolve(result);
      },
    );

    stream.end(buffer);
  });
}

export const uploadRouter = Router();

/** POST /api/upload/image - multipart form field name is "file". */
uploadRouter.post(
  "/image",
  requireAuth,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError(400, "No image was uploaded");

    const result = await uploadToCloudinary(req.file.buffer);

    res.status(201).json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    });
  }),
);
