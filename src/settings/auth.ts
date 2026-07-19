import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Gate the admin settings API with a bearer token. Fails closed: if ADMIN_TOKEN
 * is not configured, the endpoints are disabled entirely rather than left open.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const expected = env.ADMIN_TOKEN;
  if (!expected) {
    res.status(503).json({ error: "admin_disabled", message: "ADMIN_TOKEN is not set" });
    return;
  }
  const header = req.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!provided || !safeEqual(provided, expected)) {
    res.sendStatus(401);
    return;
  }
  next();
}
