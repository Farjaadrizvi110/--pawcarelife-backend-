import { createApp } from "../src/app.js";
import { connectDatabase } from "../src/config/db.js";
import { ensureAdminAccount } from "../src/services/admin.service.js";

const app = createApp();
let bootPromise: Promise<void> | null = null;

async function ensureBooted(): Promise<void> {
  if (!bootPromise) {
    bootPromise = (async () => {
      await connectDatabase();
      await ensureAdminAccount();
    })();
  }

  await bootPromise;
}

export default async function handler(req: unknown, res: unknown): Promise<void> {
  await ensureBooted();
  app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
