import { ApiError } from "./ApiError.js";

const TRANSITIONS = Object.freeze({
  OPEN:        ["ASSIGNED", "ESCALATED"],
  ASSIGNED:    ["IN_PROGRESS", "ESCALATED"],
  IN_PROGRESS: ["RESOLVED", "ESCALATED"],
  ESCALATED:   ["ASSIGNED", "IN_PROGRESS"],
  RESOLVED:    ["CLOSED"],
  CLOSED:      [],
});

const ROLE_STATUS_PERMISSIONS = Object.freeze({
  CALL_OPERATOR:   [],
  OFFICER:         ["IN_PROGRESS", "RESOLVED"],
  DEPARTMENT_HEAD: ["IN_PROGRESS", "RESOLVED", "ESCALATED"],
  ADMIN:           null,
  SUPER_ADMIN:     null,
});

export const isValidTransition = (from, to) =>
  TRANSITIONS[from]?.includes(to) ?? false;

export const assertValidTransition = (from, to) => {
  if (!isValidTransition(from, to)) {
    const allowed = TRANSITIONS[from] ?? [];
    throw new ApiError(
      422,
      allowed.length
        ? `Cannot move from ${from} to ${to}. Allowed: ${allowed.join(", ")}`
        : `${from} is a terminal status and cannot be changed`
    );
  }
};

export const assertRoleCanTransition = (role, from, to) => {
  assertValidTransition(from, to);

  const permitted = ROLE_STATUS_PERMISSIONS[role];
  if (permitted !== null && permitted !== undefined && !permitted.includes(to)) {
    throw new ApiError(
      403,
      `Your role (${role}) cannot set status to ${to}. Permitted targets: ${permitted.join(", ") || "none"}`
    );
  }
};

export const validNextStatusesForRole = (current, role) => {
  const permitted = ROLE_STATUS_PERMISSIONS[role];
  const all = TRANSITIONS[current] ?? [];
  if (permitted === null || permitted === undefined) return all;
  return all.filter((s) => permitted.includes(s));
};

export const validNextStatuses = (current) => TRANSITIONS[current] ?? [];

export const TERMINAL_STATUSES = Object.freeze(["CLOSED"]);

export const isTerminal = (status) => TERMINAL_STATUSES.includes(status);
