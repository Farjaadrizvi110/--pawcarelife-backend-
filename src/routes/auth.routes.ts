import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth, signToken, type AuthedRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { validateBody } from "../middleware/validate.js";
import { verifyCredentials } from "../services/admin.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { loginSchema, type LoginInput } from "../validation/schemas.js";

/**
 * Sign-in is the only unauthenticated route that accepts credentials, so it is
 * rate limited aggressively: a burst of guesses is refused long before bcrypt
 * becomes the bottleneck.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Please try again in 15 minutes." },
});

export const authRouter = Router();

authRouter.post(
  "/login",
  loginLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as LoginInput;

    const admin = await verifyCredentials(email, password);
    if (!admin) throw new AppError(401, "Incorrect email or password");

    res.json({ token: signToken(admin.id), email: admin.email });
  }),
);

/** Lets the dashboard confirm a stored token is still valid on page load. */
authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json({ adminId: req.adminId });
  }),
);
