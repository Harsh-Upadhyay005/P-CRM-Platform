import { ComplaintStatus, Priority } from '@/types';

// ─── KPI Stats ────────────────────────────────────────────────
export interface KpiStat {
  label: string;
  value: number;
  change: number; // percentage change from last period
  icon: string; // lucide icon name reference
  color: string; // tailwind color key
}

export const kpiStats: KpiStat[] = [
  { label: 'Total Complaints', value: 284, change: 12.5, icon: 'inbox', color: 'indigo' },
  { label: 'Pending', value: 42, change: -8.3, icon: 'clock', color: 'amber' },
  { label: 'In Progress', value: 67, change: 15.2, icon: 'loader', color: 'purple' },
  { label: 'Resolved', value: 156, change: 22.1, icon: 'check-circle', color: 'emerald' },
  { label: 'Overdue', value: 19, change: 5.7, icon: 'alert-triangle', color: 'red' },
];

// ─── Complaints Mock ──────────────────────────────────────────
export interface MockComplaint {
  id: string;
  trackingId: string;
  citizenName: string;
  category: string;
  priority: Priority;
  status: ComplaintStatus;
  assignedTo: string;
  department: string;
  createdAt: string;
  slaDeadline: string;
  description: string;
}

const categories = ['Roads & Infrastructure', 'Water Supply', 'Electricity', 'Sanitation', 'Public Safety', 'Education', 'Healthcare', 'Housing', 'Transport', 'Environment'];
const names = ['Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sunita Devi', 'Mohammed Ali', 'Anita Singh', 'Vikram Rao', 'Lakshmi Nair', 'Suresh Gupta', 'Meena Joshi', 'Kiran Desai', 'Rahul Verma', 'Deepa Menon', 'Arun Pillai', 'Geeta Bose', 'Sanjay Mishra', 'Neha Agarwal', 'Ravi Shankar', 'Pooja Reddy', 'Manoj Tiwari'];
const officers = ['Sunil Mehta', 'Kavita Reddy', 'Rajan Nair', 'Asha Kumari', 'Prakash Jha', 'Divya Singh', 'Mohan Das', 'Shreya Kapoor'];
const departments = ['Public Works', 'Water Board', 'Electricity Board', 'Municipal Corp', 'Police', 'Education Dept', 'Health Dept', 'Housing Board'];
const statuses: ComplaintStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'];
const priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const descriptions = [
  'Large pothole on main road causing accidents near the junction.',
  'No water supply for the last 3 days in sector 15.',
  'Frequent power cuts affecting daily life and businesses.',
  'Garbage not collected for over a week, causing health hazards.',
  'Streetlights not working on the highway stretch near bridge.',
  'Drainage overflow during heavy rains flooding residential area.',
  'Broken footpath making it dangerous for senior citizens.',
  'Illegal construction blocking public access to park.',
  'Noise pollution from factory operating during night hours.',
  'Contaminated water supply causing health issues in locality.',
];

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export const mockComplaints: MockComplaint[] = Array.from({ length: 40 }, (_, i) => {
  const seed = i + 1;
  const daysAgo = Math.floor(seededRandom(seed * 7) * 30);
  const created = new Date();
  created.setDate(created.getDate() - daysAgo);
  const sla = new Date(created);
  sla.setHours(sla.getHours() + 48);

  return {
    id: `comp-${String(i + 1).padStart(3, '0')}`,
    trackingId: `PCRM-2026-${String(1000 + i)}`,
    citizenName: names[i % names.length],
    category: categories[Math.floor(seededRandom(seed * 3) * categories.length)],
    priority: priorities[Math.floor(seededRandom(seed * 5) * priorities.length)],
    status: statuses[Math.floor(seededRandom(seed * 11) * statuses.length)],
    assignedTo: officers[Math.floor(seededRandom(seed * 13) * officers.length)],
    department: departments[Math.floor(seededRandom(seed * 17) * departments.length)],
    createdAt: created.toISOString(),
    slaDeadline: sla.toISOString(),
    description: descriptions[Math.floor(seededRandom(seed * 19) * descriptions.length)],
  };
});

// ─── Trend Data (complaints over time) ────────────────────────
export interface TrendPoint {
  date: string;
  complaints: number;
  resolved: number;
}

export const trendData: TrendPoint[] = Array.from({ length: 14 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (13 - i));
  return {
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    complaints: Math.floor(seededRandom((i + 1) * 23) * 20) + 5,
    resolved: Math.floor(seededRandom((i + 1) * 31) * 15) + 3,
  };
});

// ─── Category Distribution ────────────────────────────────────
export interface CategoryStat {
  name: string;
  value: number;
  fill: string;
}

export const categoryData: CategoryStat[] = [
  { name: 'Roads', value: 68, fill: '#a855f7' },
  { name: 'Water', value: 45, fill: '#06b6d4' },
  { name: 'Electricity', value: 38, fill: '#f59e0b' },
  { name: 'Sanitation', value: 52, fill: '#10b981' },
  { name: 'Safety', value: 31, fill: '#ef4444' },
  { name: 'Healthcare', value: 28, fill: '#8b5cf6' },
  { name: 'Others', value: 22, fill: '#64748b' },
];

// ─── Team Performance ─────────────────────────────────────────
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  department: string;
  assigned: number;
  completed: number;
  pending: number;
  avgResolutionHours: number;
  satisfaction: number; // 0-100
}

export const teamData: TeamMember[] = [
  { id: '1', name: 'Sunil Mehta', role: 'Senior Officer', avatar: 'SM', department: 'Public Works', assigned: 34, completed: 28, pending: 6, avgResolutionHours: 18.5, satisfaction: 92 },
  { id: '2', name: 'Kavita Reddy', role: 'Officer', avatar: 'KR', department: 'Water Board', assigned: 28, completed: 25, pending: 3, avgResolutionHours: 12.3, satisfaction: 96 },
  { id: '3', name: 'Rajan Nair', role: 'Senior Officer', avatar: 'RN', department: 'Municipal Corp', assigned: 42, completed: 35, pending: 7, avgResolutionHours: 22.1, satisfaction: 88 },
  { id: '4', name: 'Asha Kumari', role: 'Officer', avatar: 'AK', department: 'Electricity Board', assigned: 31, completed: 27, pending: 4, avgResolutionHours: 15.7, satisfaction: 91 },
  { id: '5', name: 'Prakash Jha', role: 'Department Head', avatar: 'PJ', department: 'Police', assigned: 22, completed: 20, pending: 2, avgResolutionHours: 10.2, satisfaction: 94 },
  { id: '6', name: 'Divya Singh', role: 'Officer', avatar: 'DS', department: 'Health Dept', assigned: 19, completed: 14, pending: 5, avgResolutionHours: 28.4, satisfaction: 85 },
  { id: '7', name: 'Mohan Das', role: 'Officer', avatar: 'MD', department: 'Education Dept', assigned: 15, completed: 13, pending: 2, avgResolutionHours: 14.8, satisfaction: 90 },
  { id: '8', name: 'Shreya Kapoor', role: 'Senior Officer', avatar: 'SK', department: 'Housing Board', assigned: 26, completed: 22, pending: 4, avgResolutionHours: 20.6, satisfaction: 87 },
];

// ─── Alerts ───────────────────────────────────────────────────
export interface Alert {
  id: string;
  type: 'overdue' | 'high-priority' | 'stale';
  title: string;
  description: string;
  complaintId: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
}

export const alertsData: Alert[] = [
  { id: 'a1', type: 'overdue', title: 'SLA Breach — PCRM-2026-1003', description: 'Road repair complaint overdue by 12 hours', complaintId: 'comp-004', severity: 'critical', timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: 'a2', type: 'high-priority', title: 'Critical — Water Contamination', description: 'High priority unresolved for 2 days in Sector 7', complaintId: 'comp-008', severity: 'critical', timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: 'a3', type: 'overdue', title: 'SLA Breach — PCRM-2026-1012', description: 'Electricity issue overdue by 6 hours', complaintId: 'comp-013', severity: 'warning', timestamp: new Date(Date.now() - 10800000).toISOString() },
  { id: 'a4', type: 'stale', title: 'Pending > 3 days — PCRM-2026-1005', description: 'Sanitation complaint pending since 4 days', complaintId: 'comp-006', severity: 'warning', timestamp: new Date(Date.now() - 14400000).toISOString() },
  { id: 'a5', type: 'high-priority', title: 'Critical — Gas Leak Report', description: 'Urgent gas leak in residential area, Zone 3', complaintId: 'comp-019', severity: 'critical', timestamp: new Date(Date.now() - 1800000).toISOString() },
  { id: 'a6', type: 'stale', title: 'Pending > 3 days — PCRM-2026-1020', description: 'Housing complaint no activity since 5 days', complaintId: 'comp-021', severity: 'info', timestamp: new Date(Date.now() - 21600000).toISOString() },
  { id: 'a7', type: 'overdue', title: 'SLA Breach — PCRM-2026-1028', description: 'Public safety issue overdue by 24 hours', complaintId: 'comp-029', severity: 'critical', timestamp: new Date(Date.now() - 5400000).toISOString() },
];
