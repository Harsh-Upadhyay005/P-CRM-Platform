import cron from "node-cron";
import { runAutoCloseTick } from "../services/workflow.service.js";

const CRON_SCHEDULE = "15 * * * *";

let _task = null;

export const startAutoCloseMonitor = (schedule = CRON_SCHEDULE) => {
  if (_task) return;

  if (!cron.validate(schedule)) {
    throw new Error(`[Auto Close Monitor] Invalid cron expression: "${schedule}"`);
  }

  console.log(`[Auto Close Monitor] Started - schedule: "${schedule}"`);

  runAutoCloseTick()
    .then((s) =>
      console.log(
        `[Auto Close Monitor] Boot tick: scanned=${s.scanned} closed=${s.closed} errors=${s.errors}`,
      ),
    )
    .catch(() => {});

  _task = cron.schedule(schedule, async () => {
    try {
      const s = await runAutoCloseTick();
      if (s.closed > 0 || s.errors > 0) {
        console.log(
          `[Auto Close Monitor] Tick: scanned=${s.scanned} closed=${s.closed} errors=${s.errors}`,
        );
      }
    } catch (err) {
      console.error("[Auto Close Monitor] Unhandled tick error:", err.message);
    }
  });
};

export const stopAutoCloseMonitor = () => {
  if (_task) {
    _task.stop();
    _task = null;
    console.log("[Auto Close Monitor] Stopped");
  }
};
