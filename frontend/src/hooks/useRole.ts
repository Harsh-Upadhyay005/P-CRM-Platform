import { useAuth } from "./useAuth";
import { RoleType } from "@/types";

const ROLE_RANK: Record<string, number> = {
  SUPER_ADMIN: 5,
  ADMIN: 4,
  DEPARTMENT_HEAD: 3,
  OFFICER: 2,
  CALL_OPERATOR: 1,
};

export function useRole() {
  const { user } = useAuth();
  // Ensure user.role.type is handled whether role is an object or string (backend consistency check)
  const userRole = user?.role?.type as RoleType | undefined; // Adjust based on actual API response

  const hasMinimumRole = (minimum: RoleType): boolean => {
    if (!userRole) return false;
    // Map string from backend to number
    const userRank = ROLE_RANK[userRole] || 0;
    const minRank = ROLE_RANK[minimum] || 0;
    return userRank >= minRank;
  };

  const isExactRole = (role: RoleType): boolean => userRole === role;

  return {
    role: userRole,
    hasMinimumRole,
    isExactRole,
    isCallOperator: isExactRole("CALL_OPERATOR"),
    isOfficer: hasMinimumRole("OFFICER"),
    isDeptHead: hasMinimumRole("DEPARTMENT_HEAD"),
    isAdmin: hasMinimumRole("ADMIN"),
    isSuperAdmin: isExactRole("SUPER_ADMIN"),
  };
}
