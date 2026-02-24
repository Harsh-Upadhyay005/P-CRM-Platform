export const ROLE_RANK = Object.freeze({
  SUPER_ADMIN: 5,
  ADMIN: 4,
  DEPARTMENT_HEAD: 3,
  OFFICER: 2,
  CALL_OPERATOR: 1,
});

export const getRank = (role) => {
  const rank = ROLE_RANK[role];
  if (rank === undefined) throw new Error(`Unknown role: "${role}"`);
  return rank;
};

export const canAssignRole = (actorRole, targetRole) =>
  getRank(actorRole) > getRank(targetRole);

export const canManageUser = (actorRole, subjectRole) =>
  getRank(actorRole) > getRank(subjectRole);

export const isHigherThan = (roleA, roleB) => getRank(roleA) > getRank(roleB);

export const isHigherOrEqual = (roleA, roleB) =>
  getRank(roleA) >= getRank(roleB);

export const assignableRoles = (actorRole) => {
  const actorRank = getRank(actorRole);
  return Object.entries(ROLE_RANK)
    .filter(([, rank]) => rank < actorRank)
    .sort(([, a], [, b]) => b - a)
    .map(([role]) => role);
};
