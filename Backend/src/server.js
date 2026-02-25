import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { startSlaMonitor, stopSlaMonitor } from "./jobs/slaMonitor.job.js";
import { broadcastPing } from "./services/sse.service.js";

const HEARTBEAT_INTERVAL_MS = 30_000;

const startServer = async () => {
  await connectDB();

  // Start background SLA monitor (auto-escalates breached complaints every 30 min)
  startSlaMonitor();

  // SSE keep-alive heartbeat — pings all connected clients every 30 s
  const heartbeat = setInterval(broadcastPing, HEARTBEAT_INTERVAL_MS);

  const server = app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });

  const shutdown = async () => {
    console.log("Shutting down server...");
    clearInterval(heartbeat);
    stopSlaMonitor();
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

startServer();
