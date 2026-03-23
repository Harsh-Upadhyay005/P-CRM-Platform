import cron from "node-cron";
import { prisma } from "../config/db.js";
import {
  isSlaBreached,
  NON_SLA_STATUSES,
  getSlaRemainingMs,
} from "../utils/slaEngine.js";
import {
  sendSlaBreachEmail,
  sendSlaReminderEmail,
} from "../services/email.service.js";
import {
  buildCategorySlaLookupForComplaints,
  resolveEffectiveSlaHours,
} from "../services/workflow.service.js";

const CRON_SCHEDULE = "0,30 * * * *";
const BATCH_SIZE = 100;

// Reminder thresholds — notify when elapsed fraction crosses these marks.
// We use a ±5 minute tolerance window so a 30-min cron cadence never misses a boundary.
const REMINDER_THRESHOLDS = [
  {
    fraction: 0.5,
    label: "50%",
    notificationTitle: "SLA Reminder — 50% Time Elapsed",
  },
  {
    fraction: 0.75,
    label: "75%",
    notificationTitle: "SLA Warning — 75% Time Elapsed (Approaching Breach)",
  },
];
const TOLERANCE_MS = 5 * 60 * 1000; // ±5 min window

export const runSlaTick = async () => {
  const summary = { scanned: 0, escalated: 0, reminded: 0, errors: 0 };

  try {
    let cursor = undefined;
    let batch;
    const allCandidates = [];

    do {
      batch = await prisma.complaint.findMany({
        where: {
          isDeleted: false,
          status: { notIn: NON_SLA_STATUSES },
        },
        select: {
          id: true,
          tenantId: true,
          trackingId: true,
          status: true,
          category: true,
          citizenName: true,
          citizenEmail: true,
          createdAt: true,
          assignedToId: true,
          createdById: true,
          department: {
            select: {
              id: true,
              name: true,
              slaHours: true,
              users: {
                where: {
                  role: { type: "DEPARTMENT_HEAD" },
                  isDeleted: false,
                  isActive: true,
                },
                select: { id: true, name: true, email: true },
              },
            },
          },
          assignedTo: { select: { id: true, name: true, email: true } },
          createdBy: { select: { name: true, email: true } },
        },
        take: BATCH_SIZE,
        ...(cursor && { skip: 1, cursor: { id: cursor } }),
        orderBy: { id: "asc" },
      });
      allCandidates.push(...batch);
      if (batch.length === BATCH_SIZE) cursor = batch[batch.length - 1].id;
    } while (batch.length === BATCH_SIZE);

    const candidates = allCandidates;
    summary.scanned = candidates.length;
    if (candidates.length === 0) return summary;

    const policyLookup = await buildCategorySlaLookupForComplaints(candidates);

    // ── Separate candidates into breached vs reminder-eligible ──────────────
    const breached = [];
    const toRemind = []; // { complaint, threshold }

    for (const complaint of candidates) {
      const slaHours = resolveEffectiveSlaHours(complaint, policyLookup);
      const totalMs = slaHours * 3_600_000;
      const remainMs = getSlaRemainingMs(complaint.createdAt, slaHours);
      const elapsedMs = totalMs - remainMs;

      if (remainMs < 0) {
        // Already breached — escalate
        breached.push({ ...complaint, effectiveSlaHours: slaHours });
      } else {
        // Check if we are inside a ±TOLERANCE_MS window around a reminder threshold
        for (const threshold of REMINDER_THRESHOLDS) {
          const thresholdMs = threshold.fraction * totalMs;
          const distanceFromEdge = Math.abs(elapsedMs - thresholdMs);
          if (distanceFromEdge <= TOLERANCE_MS) {
            toRemind.push({
              complaint: { ...complaint, effectiveSlaHours: slaHours },
              threshold,
            });
            break; // Only fire the highest-priority matching threshold per tick
          }
        }
      }
    }

    // ── Escalate breached complaints ────────────────────────────────────────
    if (breached.length > 0) {
      const tenantAdminMap = await getAdminIdsPerTenant([
        ...new Set(breached.map((c) => c.tenantId)),
      ]);

      for (const complaint of breached) {
        try {
          await escalateComplaint(complaint, tenantAdminMap);
          summary.escalated++;
        } catch (err) {
          summary.errors++;
          console.error(
            `[SLA Monitor] Failed to escalate complaint ${complaint.id}:`,
            err.message,
          );
        }
      }
    }

    // ── Send SLA reminder nudges ─────────────────────────────────────────────
    for (const { complaint, threshold } of toRemind) {
      try {
        await sendSlaReminder(complaint, threshold);
        summary.reminded++;
      } catch (err) {
        summary.errors++;
        console.error(
          `[SLA Monitor] Failed to send reminder for complaint ${complaint.id}:`,
          err.message,
        );
      }
    }
  } catch (err) {
    summary.errors++;
    console.error("[SLA Monitor] Tick error:", err.message);
  }

  return summary;
};

// ── SLA Reminder Nudge ────────────────────────────────────────────────────────

const sendSlaReminder = async (complaint, threshold) => {
  const deptHead = complaint.department?.users?.[0] ?? null;
  const officerId = complaint.assignedToId;
  const deptHeadId = deptHead?.id ?? null;

  // Only send reminders for assigned complaints — unassigned ones have no one to nudge
  if (!officerId && !deptHeadId) return;

  const recipientSet = new Set([officerId, deptHeadId].filter(Boolean));

  // In-app notifications
  if (recipientSet.size > 0) {
    await prisma.notification.createMany({
      data: [...recipientSet].map((userId) => ({
        userId,
        complaintId: complaint.id,
        title: threshold.notificationTitle,
        message: `Complaint ${complaint.trackingId} has used ${threshold.label} of its SLA window. Please take action to avoid a breach.`,
        isRead: false,
      })),
      skipDuplicates: true,
    });
  }

  // Email nudges
  const emailRecipients = [];
  if (complaint.assignedTo?.email) {
    emailRecipients.push({
      email: complaint.assignedTo.email,
      name: complaint.assignedTo.name,
    });
  }
  if (deptHead?.email) {
    const alreadyAdded = emailRecipients.some(
      (r) => r.email === deptHead.email,
    );
    if (!alreadyAdded) {
      emailRecipients.push({ email: deptHead.email, name: deptHead.name });
    }
  }

  if (emailRecipients.length > 0) {
    sendSlaReminderEmail(
      emailRecipients,
      complaint.trackingId,
      complaint.department?.name ?? "Unknown",
      complaint.createdAt,
      complaint.effectiveSlaHours ?? complaint.department?.slaHours ?? 48,
      threshold.label,
    ).catch(() => {});
  }
};

// ── SLA Breach Escalation ─────────────────────────────────────────────────────

const escalateComplaint = async (complaint, tenantAdminMap) => {
  let adminIds = tenantAdminMap[complaint.tenantId] ?? [];
  const deptHead = complaint.department?.users?.[0] ?? null;

  // Last-resort: if no admin was found for this tenant in the pre-fetched map, query now
  if (adminIds.length === 0) {
    const admins = await prisma.user.findMany({
      where: {
        tenantId: complaint.tenantId,
        isDeleted: false,
        isActive: true,
        role: { type: { in: ["ADMIN", "SUPER_ADMIN"] } },
      },
      select: { id: true },
      take: 1,
    });
    adminIds = admins.map((a) => a.id);
  }

  let actorId =
    adminIds[0] ??
    complaint.createdById ??
    complaint.assignedToId ??
    deptHead?.id ??
    null;

  if (!actorId) {
    const fallbackUser = await prisma.user.findFirst({
      where: {
        tenantId: complaint.tenantId,
        isDeleted: false,
        isActive: true,
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    actorId = fallbackUser?.id ?? null;
  }

  if (!actorId) {
    throw new Error("No active tenant user available for escalation actor");
  }

  await prisma.$transaction([
    prisma.complaint.update({
      where: { id: complaint.id },
      data: { status: "ESCALATED" },
    }),
    prisma.complaintStatusHistory.create({
      data: {
        complaintId: complaint.id,
        oldStatus: complaint.status,
        newStatus: "ESCALATED",
        changedById: actorId,
      },
    }),
  ]);

  notifyEscalation(complaint, adminIds).catch(() => {});
};

const notifyEscalation = async (complaint, adminIds) => {
  const deptHead = complaint.department?.users?.[0] ?? null;

  const recipientSet = new Set(
    [
      ...adminIds,
      complaint.createdById,
      complaint.assignedToId,
      deptHead?.id ?? null,
    ].filter(Boolean),
  );
  if (recipientSet.size === 0) return;

  await prisma.notification.createMany({
    data: [...recipientSet].map((userId) => ({
      userId,
      complaintId: complaint.id,
      title: "Complaint Auto-Escalated (SLA Breach)",
      message:
        "A complaint has exceeded its SLA window and has been automatically escalated.",
      isRead: false,
    })),
    skipDuplicates: true,
  });

  const emailRecipients = [];
  if (complaint.createdBy?.email) {
    emailRecipients.push({
      email: complaint.createdBy.email,
      name: complaint.createdBy.name,
    });
  }
  if (complaint.citizenEmail) {
    const alreadyAdded = emailRecipients.some(
      (r) => r.email === complaint.citizenEmail,
    );
    if (!alreadyAdded) {
      emailRecipients.push({
        email: complaint.citizenEmail,
        name: complaint.citizenName ?? "Citizen",
      });
    }
  }
  if (complaint.assignedTo?.email) {
    const alreadyAdded = emailRecipients.some(
      (r) => r.email === complaint.assignedTo.email,
    );
    if (!alreadyAdded) {
      emailRecipients.push({
        email: complaint.assignedTo.email,
        name: complaint.assignedTo.name,
      });
    }
  }
  if (deptHead?.email) {
    const alreadyAdded = emailRecipients.some(
      (r) => r.email === deptHead.email,
    );
    if (!alreadyAdded) {
      emailRecipients.push({ email: deptHead.email, name: deptHead.name });
    }
  }

  if (emailRecipients.length > 0) {
    sendSlaBreachEmail(
      emailRecipients,
      complaint.trackingId,
      complaint.department?.name ?? "Unknown",
      complaint.createdAt,
      complaint.effectiveSlaHours ?? complaint.department?.slaHours ?? 48,
    ).catch(() => {});
  }
};

const getAdminIdsPerTenant = async (tenantIds) => {
  if (tenantIds.length === 0) return {};

  const admins = await prisma.user.findMany({
    where: {
      tenantId: { in: tenantIds },
      isDeleted: false,
      isActive: true,
      role: { type: { in: ["ADMIN", "SUPER_ADMIN"] } },
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

  runSlaTick()
    .then((s) =>
      console.log(
        `[SLA Monitor] Boot tick: scanned=${s.scanned} escalated=${s.escalated} errors=${s.errors}`,
      ),
    )
    .catch(() => {});

  _task = cron.schedule(schedule, async () => {
    try {
      const s = await runSlaTick();
      if (s.escalated > 0 || s.reminded > 0 || s.errors > 0) {
        console.log(
          `[SLA Monitor] Tick: scanned=${s.scanned} escalated=${s.escalated} reminded=${s.reminded} errors=${s.errors}`,
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
