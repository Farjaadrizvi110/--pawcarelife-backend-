import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { env } from "../config/env.js";

/** An error that carries the HTTP status it should be returned with. */
export class AppError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

function isDuplicateKeyError(err: unknown): err is { keyValue?: Record<string, unknown> } {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === 11000
  );
}

/** Answers anything that matched no route. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

/**
 * The single exit point for every failure. Translating the error types this app
 * actually produces into clean responses here keeps route handlers free of
 * try/catch noise and stops internals leaking in production.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: err.issues[0]?.message ?? "Validation failed",
      issues: err.issues,
    });
    return;
  }

  if (err instanceof MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Image must be 6 MB or smaller"
        : `Upload failed: ${err.message}`;
    res.status(400).json({ error: message });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: "Invalid identifier" });
    return;
  }

  if (isDuplicateKeyError(err)) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? "value";
    res.status(409).json({ error: `That ${field} is already in use` });
    return;
  }

  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "Request body is not valid JSON" });
    return;
  }

  console.error("[error] unhandled:", err);
  res.status(500).json({
    error: env.isProduction ? "Internal server error" : String(err),
  });
}
