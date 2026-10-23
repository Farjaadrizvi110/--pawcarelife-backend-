import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { AdminModel } from "../models/Admin.js";

/** Cost factor for password hashing. 12 keeps sign-in well under a second. */
const SALT_ROUNDS = 12;

/** The signed-in account, reduced to what the API actually needs to expose. */
export interface AuthenticatedAdmin {
  id: string;
  email: string;
}

/**
 * Creates the dashboard account from ADMIN_EMAIL / ADMIN_PASSWORD if it is
 * missing. Runs on every startup and is idempotent: an existing account is
 * never overwritten, so editing the password in .env cannot silently reset an
 * account that was changed afterwards.
 */
export async function ensureAdminAccount(): Promise<void> {
  const email = env.ADMIN_EMAIL.toLowerCase();

  if (await AdminModel.exists({ email })) return;

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, SALT_ROUNDS);
  await AdminModel.create({ email, passwordHash });
  console.log(`[auth] created dashboard account for ${email}`);
}

/**
 * Returns the matching admin, or null when either the email or the password is
 * wrong. The caller deliberately cannot tell the two cases apart.
 */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<AuthenticatedAdmin | null> {
  const admin = await AdminModel.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!admin) return null;

  const matches = await bcrypt.compare(password, admin.passwordHash);
  if (!matches) return null;

  return { id: String(admin._id), email: admin.email };
}
