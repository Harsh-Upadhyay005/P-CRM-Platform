import { ApiError } from "./ApiError.js";

const TRANSITIONS = Object.freeze({
  OPEN:        ["ASSIGNED", "ESCALATED"],
  ASSIGNED:    ["IN_PROGRESS", "ESCALATED"],
  IN_PROGRESS: ["RESOLVED", "ESCALATED"],
  ESCALATED:   ["ASSIGNED", "IN_PROGRESS"],
  RESOLVED:    ["CLOSED"],
  CLOSED:      [],
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

export const validNextStatuses = (current) => TRANSITIONS[current] ?? [];

export const TERMINAL_STATUSES = Object.freeze(["CLOSED"]);

export const isTerminal = (status) => TERMINAL_STATUSES.includes(status);
