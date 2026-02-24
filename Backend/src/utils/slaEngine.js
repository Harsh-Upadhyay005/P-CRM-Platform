export const SLA_STATE = Object.freeze({
  OK:      "OK",
  WARNING: "WARNING",
  BREACHED: "BREACHED",
});

export const NON_SLA_STATUSES = Object.freeze(["RESOLVED", "CLOSED", "ESCALATED"]);

export const getSlaDeadline = (createdAt, slaHours) =>
  new Date(new Date(createdAt).getTime() + slaHours * 3_600_000);

export const getSlaRemainingMs = (createdAt, slaHours) =>
  getSlaDeadline(createdAt, slaHours).getTime() - Date.now();

export const isSlaBreached = (createdAt, slaHours) =>
  getSlaRemainingMs(createdAt, slaHours) < 0;

export const getSlaState = (createdAt, slaHours) => {
  const totalMs     = slaHours * 3_600_000;
  const remainingMs = getSlaRemainingMs(createdAt, slaHours);

  if (remainingMs < 0) return SLA_STATE.BREACHED;

  const elapsedFraction = (totalMs - remainingMs) / totalMs;
  return elapsedFraction >= 0.75 ? SLA_STATE.WARNING : SLA_STATE.OK;
};

export const buildSlaSummary = (createdAt, slaHours) => {
  const deadline    = getSlaDeadline(createdAt, slaHours);
  const remainingMs = getSlaRemainingMs(createdAt, slaHours);
  const state       = getSlaState(createdAt, slaHours);
  const breached    = remainingMs < 0;

  const formatDuration = (ms) => {
    const absMs   = Math.abs(ms);
    const hours   = Math.floor(absMs / 3_600_000);
    const minutes = Math.floor((absMs % 3_600_000) / 60_000);
    return `${hours}h ${minutes}m`;
  };

  return {
    state,
    deadline,
    breached,
    remainingMs:    breached ? 0 : remainingMs,
    overdueMs:      breached ? -remainingMs : 0,
    remainingLabel: breached
      ? `Overdue by ${formatDuration(remainingMs)}`
      : `${formatDuration(remainingMs)} remaining`,
  };
};

export const countSlaBreached = (complaints, fallbackSlaHours = 48) =>
  complaints.reduce((count, c) => {
    const slaHours = c.department?.slaHours ?? fallbackSlaHours;
    return count + (isSlaBreached(c.createdAt, slaHours) ? 1 : 0);
  }, 0);
