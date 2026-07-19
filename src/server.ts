import express, { type Request } from "express";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { env } from "./config/env.js";
import { onboardingRouter } from "./onboarding/routes.js";
import { getMetaConfig } from "./settings/service.js";
import { settingsRouter } from "./settings/routes.js";
import { webhookRouter } from "./webhooks/routes.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
// public/ sits next to src/ (dev) and next to dist/ (build), i.e. one level up.
const publicDir = resolve(currentDir, "../public");

export function createServer() {
  const app = express();

  // Capture the raw body so webhook signature verification works. The parsed
  // JSON is still available on req.body for handlers.
  app.use(
    express.json({
      verify: (req: Request & { rawBody?: Buffer }, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // Public, client-side-safe config for the Embedded Signup page.
  // appId/configId are resolved from settings (DB) or env; never the app secret.
  app.get("/config.json", async (_req, res) => {
    const { appId, configId } = await getMetaConfig();
    res.json({ appId, configId, graphVersion: env.GRAPH_API_VERSION });
  });

  app.use("/webhooks", webhookRouter);
  app.use("/onboarding", onboardingRouter);
  app.use("/admin", settingsRouter);

  // Serve the Embedded Signup frontend (public/index.html) as the app root.
  app.use(express.static(publicDir));

  return app;
}
