import { Router } from "express";
import { z } from "zod";
import { onboardClient } from "./service.js";

export const onboardingRouter = Router();

const onboardSchema = z.object({
  code: z.string().min(1),
  wabaId: z.string().min(1),
  phoneNumberId: z.string().min(1),
});

/**
 * POST /onboarding/complete
 * Called by your frontend after the Embedded Signup popup returns the OAuth
 * code and the selected WABA / phone number IDs.
 */
onboardingRouter.post("/complete", async (req, res) => {
  const parsed = onboardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_request", details: parsed.error.issues });
  }

  try {
    const result = await onboardClient(parsed.data);
    return res.status(201).json({ status: "onboarded", ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[onboarding] failed:", message);
    return res.status(502).json({ error: "onboarding_failed", message });
  }
});
