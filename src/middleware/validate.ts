import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

/**
 * Validates the request body and replaces it with the parsed result, so route
 * handlers only ever see trusted, correctly typed data. Failures are forwarded
 * to the error handler, which renders them consistently.
 */
export function validateBody<TOutput>(schema: ZodType<TOutput>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(result.error);
      return;
    }

    req.body = result.data;
    next();
  };
}
