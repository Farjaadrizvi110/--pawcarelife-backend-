import cors from "cors";
import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { databaseStatus } from "./config/db.js";
import { env } from "./config/env.js";
import { AppError, errorHandler, notFoundHandler } from "./middleware/error.js";
import { apiRouter } from "./routes/index.js";

/** Requests larger than this are rejected before reaching a route. */
const JSON_BODY_LIMIT = "2mb";

/** Baseline throughput per IP across the whole API (sign-in is limited harder). */
const globalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

/**
 * Builds the Express application. Kept separate from the listener so tests and
 * tooling can exercise the app without opening a port.
 */
export function createApp(): Express {
  const app = express();

  // Behind a proxy (Render, Netlify, Cloudflare) this makes req.ip the real
  // visitor, which the rate limiter depends on.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

  app.use(
    cors({
      origin: (origin, callback) => {
        // No Origin header means a non-browser caller: curl, the site build, or
        // another server. Those are always allowed.
        if (!origin || env.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new AppError(403, `Origin not allowed: ${origin}`));
      },
    }),
  );

  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  /** Unauthenticated liveness probe - also reported to uptime monitors. */
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, db: databaseStatus(), uptime: process.uptime() });
  });

  app.use("/api", globalLimiter);
  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
