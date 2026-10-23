import { Schema, model, type InferSchemaType } from "mongoose";

/**
 * A single dashboard account. The account is provisioned automatically from
 * ADMIN_EMAIL / ADMIN_PASSWORD on first startup, so there is no public
 * sign-up route to attack.
 */
const adminSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    /** Hidden from queries by default - opt in with .select("+passwordHash"). */
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true },
);

export type Admin = InferSchemaType<typeof adminSchema>;

export const AdminModel = model("Admin", adminSchema);
