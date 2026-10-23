import { access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Router } from "express";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const buildRouter = Router();

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const localSyncScript = resolve(__dirname, "../../../../app/scripts/sync-content.mjs");

async function runLocalContentSync(): Promise<boolean> {
  try {
    await access(localSyncScript);
  } catch {
    return false;
  }

  await execFileAsync(process.execPath, [localSyncScript], {
    cwd: resolve(__dirname, "../../../../app"),
    env: {
      ...process.env,
      CMS_API_URL: `http://localhost:${env.PORT}`,
    },
  });

  return true;
}

/**
 * Fires the Netlify build hook so a newly published article is baked into the
 * static HTML Google reads. Optional: without a configured hook the dashboard
 * simply cannot auto-publish, and says so clearly.
 */
buildRouter.post(
  "/rebuild",
  requireAuth,
  asyncHandler(async (_req, res) => {
    if (!env.netlifyBuildHook) {
      const synced = await runLocalContentSync();

      if (!synced) {
        throw new AppError(501, "No build hook configured. Set NETLIFY_BUILD_HOOK in api/.env");
      }

      res.json({
        triggered: true,
        mode: "local",
        message: "Local content updated.",
      });
      return;
    }

    const response = await fetch(env.netlifyBuildHook, { method: "POST" });
    if (!response.ok) {
      throw new AppError(502, `Build hook responded with ${response.status}`);
    }

    res.json({
      triggered: true,
      mode: "netlify",
      message: "Build started - the live site updates in about a minute.",
    });
  }),
);
