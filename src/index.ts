import { env } from "./config/env.js";
import { migrate } from "./db/migrate.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  await migrate();

  const app = createServer();
  app.listen(env.PORT, () => {
    console.log(`whatsappapi listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error("[startup] failed:", err);
  process.exit(1);
});
