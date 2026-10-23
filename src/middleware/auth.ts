import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

/** A request that has passed through requireAuth. */
export interface AuthedRequest extends Request {
  adminId?: string;
}

/** Issues a short-lived dashboard session token. */
export function signToken(adminId: string): string {
  return jwt.sign({ sub: adminId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

/**
 * Guards every dashboard-only route. Missing, malformed and expired tokens all
 * return the same message, so nothing about the token is revealed.
 */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET) as jwt.JwtPayload;
    req.adminId = String(payload.sub);
    next();
  } catch {
    res.status(401).json({ error: "Session expired or invalid. Please sign in again." });
  }
}
