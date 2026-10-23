import { createApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { ensureAdminAccount } from "./services/admin.service.js";

/**
 * Startup order matters: the database and the dashboard account are ready
 * before the port opens, so the first request can never hit a half-built app.
 */
async function bootstrap(): Promise<void> {
  await connectDatabase();
  console.log("[db] connected");
  await ensureAdminAccount();

  const server = createApp().listen(env.PORT, () => {
    console.log(`[api] listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal: string): void => {
    console.log(`[api] ${signal} received - shutting down`);
    server.close(() => {
      void disconnectDatabase().finally(() => process.exit(0));
    });
  };

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => shutdown(signal));
  }
}

bootstrap().catch((error: unknown) => {
  console.error("[fatal]", error instanceof Error ? error.message : error);
  process.exit(1);
});
