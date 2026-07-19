import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "./auth.js";
import { getMetaConfigStatus, saveMetaConfig } from "./service.js";

export const settingsRouter = Router();

// All settings endpoints require the admin bearer token.
settingsRouter.use(requireAdmin);

/** GET /admin/settings — current config status (never returns the secret value). */
settingsRouter.get("/settings", async (_req, res) => {
  res.json(await getMetaConfigStatus());
});

const updateSchema = z.object({
  appId: z.string().min(1).optional(),
  configId: z.string().min(1).optional(),
  // Omit or send empty to keep the existing secret unchanged.
  appSecret: z.string().min(1).optional(),
});

/** PUT /admin/settings — update provided fields only. */
settingsRouter.put("/settings", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_request", details: parsed.error.issues });
  }
  await saveMetaConfig(parsed.data);
  res.json(await getMetaConfigStatus());
});
