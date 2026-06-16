import { useAuth } from "./useAuth";
import { RoleType } from "@/types";
import { getRoleLabel } from "@/lib/roleLabels";

const ROLE_RANK: Record<string, number> = {
  SUPER_ADMIN: 5,
  ADMIN: 4,
  DEPARTMENT_HEAD: 3,
  OFFICER: 2,
  CALL_OPERATOR: 1,
  CITIZEN: 0,
};

export function useRole() {
  const { user } = useAuth();
  const userRole = user?.role?.type as RoleType | undefined;

  const hasMinimumRole = (minimum: RoleType): boolean => {
    if (!userRole) return false;
    const userRank = ROLE_RANK[userRole] || 0;
    const minRank = ROLE_RANK[minimum] || 0;
    return userRank >= minRank;
  };

  const isExactRole = (role: RoleType): boolean => userRole === role;

  return {
    role: userRole,
    /** Human-readable display label for the user's role (e.g. "Delhi CM Office"). */
    roleLabel: getRoleLabel(userRole),
    hasMinimumRole,
    isExactRole,
    isCitizen: isExactRole("CITIZEN"),
    isCallOperator: isExactRole("CALL_OPERATOR"),
    isOfficer: hasMinimumRole("OFFICER"),
    isDeptHead: hasMinimumRole("DEPARTMENT_HEAD"),
    /** True only when the user is exactly the Department Admin role. */
    isDepAdmin: isExactRole("ADMIN"),
    /** True for ADMIN and above (SUPER_ADMIN, ADMIN). */
    isAdmin: hasMinimumRole("ADMIN"),
    isSuperAdmin: isExactRole("SUPER_ADMIN"),
  };
}

