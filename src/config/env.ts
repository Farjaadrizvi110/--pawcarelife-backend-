import "dotenv/config";
import { z } from "zod";

/**
 * Every environment variable the API reads is declared here and validated once
 * at startup. If anything is missing or malformed the process exits with a
 * readable list instead of failing later with a confusing runtime error.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  CORS_ORIGIN: z.string().default("http://localhost:5174"),
  DNS_SERVERS: z.string().default("8.8.8.8,1.1.1.1"),

  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("12h"),
  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be a valid email address"),
  ADMIN_PASSWORD: z.string().min(8, "ADMIN_PASSWORD must be at least 8 characters"),

  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),

  NETLIFY_BUILD_HOOK: z.string().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
  console.error(
    `[env] Invalid configuration:\n${details}\n\n` +
      "Copy api/.env.example to api/.env and fill in every value.",
  );
  process.exit(1);
}

const raw = parsed.data;

/** Helper: "a, b , c" -> ["a", "b", "c"] */
const toList = (value: string): string[] =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

export const env = {
  ...raw,
  isProduction: raw.NODE_ENV === "production",
  corsOrigins: toList(raw.CORS_ORIGIN),
  dnsServers: toList(raw.DNS_SERVERS),
  netlifyBuildHook: raw.NETLIFY_BUILD_HOOK.trim(),
} as const;
