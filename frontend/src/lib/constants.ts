/**
 * Standard civic complaint categories — used on both the public submit
 * form and the authenticated "File New Complaint" form to keep data
 * consistent across all complaints in the database.
 */
export const COMPLAINT_CATEGORIES = [
  'Roads & Infrastructure',
  'Water Supply',
  'Electricity',
  'Sanitation & Waste',
  'Public Safety',
  'Healthcare',
  'Education',
  'Transportation',
  'Housing & Construction',
  'Environment',
  'Parks & Recreation',
  'Noise Complaint',
  'Animal Control',
  'Other',
] as const;

export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number];
