import type { Request, Response, NextFunction } from "express";
import {type FixedWindowConfig, attempt } from "../components/fixedWindows.ts";

const DEFAULT_CONFIG: FixedWindowConfig = {
  maxRequest: 10,
  windowSeconds: 10,
};

export type FixedWindowMiddlewareOptions = {
  /** Rate limit config. Default: 10 requests per 10 seconds */
  config?: FixedWindowConfig;
  /** Key prefix in Redis. Default: "rl" */
  keyPrefix?: string;
  /** How to get the client identifier from the request. Default: req.ip */
  getIdentifier?: (req: Request) => string;
};

/**
 * Express middleware: fixed-window rate limit per identifier (e.g. IP).
 * Responds with 429 and Retry-After when over limit; sets X-RateLimit-* headers when allowed.
 */
export function fixedWindowMiddleware(options: FixedWindowMiddlewareOptions = {}) {
  const {
    config = DEFAULT_CONFIG,
    keyPrefix = "rl",
    getIdentifier = (req: Request) => req.ip ?? req.socket.remoteAddress ?? "anonymous",
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getIdentifier(req);
      const key = `${keyPrefix}:${id}`;
      const result = await attempt(key, config);

      res.setHeader("X-RateLimit-Limit", String(result.limit));
      res.setHeader("X-RateLimit-Remaining", String(result.remaining));

      if (!result.allowed) {
        if (result.retryAfter != null) {
          res.setHeader("Retry-After", String(result.retryAfter));
        }
        return res.status(429).json({
          message: "Too many requests",
          retryAfter: result.retryAfter ?? undefined,
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
