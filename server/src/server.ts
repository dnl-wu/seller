import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectToDatabase, disconnectFromDatabase } from "./config/db.js";

async function main(): Promise<void> {
  await connectToDatabase();

  const server = app.listen(env.port, () => {
    console.log(`Server listening on port ${env.port}`);
  });

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      disconnectFromDatabase()
        .catch((err) => console.error("Error disconnecting from MongoDB:", err))
        .finally(() => process.exit(0));
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Fatal error during startup:", err);
  process.exit(1);
});
