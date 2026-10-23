import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

/** Folder every article image is stored under, keeping the media library tidy. */
export const ARTICLE_IMAGE_FOLDER = "pawcare/articles";

export { cloudinary };
