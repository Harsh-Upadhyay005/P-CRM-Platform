import cron from "node-cron";
import { prisma } from "../config/db.js";
import { isSlaBreached, NON_SLA_STATUSES } from "../utils/slaEngine.js";

const CRON_SCHEDULE = "0,30 * * * *";
const BATCH_SIZE = 100;

export const runSlaTick = async () => {
  const summary = { scanned: 0, escalated: 0, errors: 0 };

  try {
    const candidates = await prisma.complaint.findMany({
      where: {
        isDeleted:    false,
        status:       { notIn: NON_SLA_STATUSES },
        departmentId: { not: null },
      },
      select: {
        id:           true,
        tenantId:     true,
        status:       true,
        createdAt:    true,
        assignedToId: true,
        createdById:  true,
        department:   { select: { slaHours: true } },
      },
      take:    BATCH_SIZE,
      orderBy: { createdAt: "asc" },
    });

    summary.scanned = candidates.length;
    if (candidates.length === 0) return summary;

    const breached = candidates.filter((c) =>
      isSlaBreached(c.createdAt, c.department?.slaHours ?? 48)
    );

    if (breached.length === 0) return summary;

    const tenantAdminMap = await getAdminIdsPerTenant(
      [...new Set(breached.map((c) => c.tenantId))]
    );

    for (const complaint of breached) {
      try {
        await escalateComplaint(complaint, tenantAdminMap);
        summary.escalated++;
      } catch (err) {
        summary.errors++;
        console.error(
          `[SLA Monitor] Failed to escalate complaint ${complaint.id}:`,
          err.message
        );
      }
    }
  } catch (err) {
    summary.errors++;
    console.error("[SLA Monitor] Tick error:", err.message);
  }

  return summary;
};

const escalateComplaint = async (complaint, tenantAdminMap) => {
  const adminIds = tenantAdminMap[complaint.tenantId] ?? [];
  const actorId  = adminIds[0] ?? complaint.createdById;

  if (!actorId) return;

  await prisma.$transaction([
    prisma.complaint.update({
      where: { id: complaint.id },
      data:  { status: "ESCALATED" },
    }),
    prisma.complaintStatusHistory.create({
      data: {
        complaintId: complaint.id,
        oldStatus:   complaint.status,
        newStatus:   "ESCALATED",
        changedById: actorId,
      },
    }),
  ]);

  notifyEscalation(complaint, adminIds).catch(() => {});
};

const notifyEscalation = async (complaint, adminIds) => {
  const recipientSet = new Set(
    [...adminIds, complaint.createdById, complaint.assignedToId].filter(Boolean)
  );
  if (recipientSet.size === 0) return;

  await prisma.notification.createMany({
    data: [...recipientSet].map((userId) => ({
      userId,
      complaintId: complaint.id,
      title:   "Complaint Auto-Escalated (SLA Breach)",
      message: "A complaint has exceeded its SLA window and has been automatically escalated.",
      isRead:  false,
    })),
    skipDuplicates: true,
  });
};

const getAdminIdsPerTenant = async (tenantIds) => {
  if (tenantIds.length === 0) return {};

  const admins = await prisma.user.findMany({
    where: {
      tenantId:  { in: tenantIds },
      isDeleted: false,
      isActive:  true,
      role:      { type: { in: ["ADMIN", "SUPER_ADMIN"] } },
    },
    select: { id: true, tenantId: true },
  });

  return admins.reduce((map, u) => {
    if (!map[u.tenantId]) map[u.tenantId] = [];
    map[u.tenantId].push(u.id);
    return map;
  }, {});
};

let _task = null;

export const startSlaMonitor = (schedule = CRON_SCHEDULE) => {
  if (_task) return;

  if (!cron.validate(schedule)) {
    throw new Error(`[SLA Monitor] Invalid cron expression: "${schedule}"`);
  }

  console.log(`[SLA Monitor] Started — schedule: "${schedule}"`);

  runSlaTick().then((s) =>
    console.log(
      `[SLA Monitor] Boot tick: scanned=${s.scanned} escalated=${s.escalated} errors=${s.errors}`
    )
  ).catch(() => {});

  _task = cron.schedule(schedule, async () => {
    try {
      const s = await runSlaTick();
      if (s.escalated > 0 || s.errors > 0) {
        console.log(
          `[SLA Monitor] Tick: scanned=${s.scanned} escalated=${s.escalated} errors=${s.errors}`
        );
      }
    } catch (err) {
      console.error("[SLA Monitor] Unhandled tick error:", err.message);
    }
  });
};

export const stopSlaMonitor = () => {
  if (_task) {
    _task.stop();
    _task = null;
    console.log("[SLA Monitor] Stopped");
  }
};

