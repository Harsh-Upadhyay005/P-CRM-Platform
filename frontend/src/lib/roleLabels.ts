import { RoleType } from '@/types';

/**
 * Human-readable display labels for each role on the Delhi CRM platform.
 * The underlying DB enum values (SUPER_ADMIN, ADMIN, etc.) are unchanged —
 * only the user-facing presentation changes.
 */
export const ROLE_DISPLAY_LABELS: Record<RoleType, string> = {
  SUPER_ADMIN: 'Delhi CM Office',
  ADMIN: 'Department Admin',
  DEPARTMENT_HEAD: 'Department Head',
  OFFICER: 'Officer',
  CALL_OPERATOR: 'Call Operator',
  CITIZEN: 'Citizen',
};

/** Short labels used in compact UI (badges, table cells). */
export const ROLE_SHORT_LABELS: Record<RoleType, string> = {
  SUPER_ADMIN: 'CM Office',
  ADMIN: 'Dept. Admin',
  DEPARTMENT_HEAD: 'Dept. Head',
  OFFICER: 'Officer',
  CALL_OPERATOR: 'Operator',
  CITIZEN: 'Citizen',
};

/** Returns the display label for a role, falling back to the raw type string. */
export function getRoleLabel(roleType: RoleType | string | undefined, short = false): string {
  if (!roleType) return '—';
  const map = short ? ROLE_SHORT_LABELS : ROLE_DISPLAY_LABELS;
  return map[roleType as RoleType] ?? roleType;
}
