const fs = require('fs');
const file = 'frontend/src/components/layout/Sidebar.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Add translation hook import
content = content.replace(/import { useSidebar } from "@\/lib\/sidebar-context";/, "import { useSidebar } from \"@/lib/sidebar-context\";\nimport { useTranslation } from 'react-i18next';");

// Add hook inside component
content = content.replace(/export function Sidebar\(\) \{/, 'export function Sidebar() {\n  const { t } = useTranslation();');

// Menu labels
const replacements = [
  ['label: "Dashboard",', 'label: t(\'sidebar.dashboard\', "Dashboard"),'],
  ['label: "Map",', 'label: t(\'sidebar.map\', "Map"),'],
  ['label: "Complaints",', 'label: t(\'sidebar.complaints\', "Complaints"),'],
  ['label: "File Complaint",', 'label: t(\'sidebar.fileComplaint\', "File Complaint"),'],
  ['label: "Users",', 'label: t(\'sidebar.users\', "Users"),'],
  ['label: "Departments",', 'label: t(\'sidebar.departments\', "Departments"),'],
  ['label: "Workflow",', 'label: t(\'sidebar.workflow\', "Workflow"),'],
  ['label: "Analytics",', 'label: t(\'sidebar.analytics\', "Analytics"),'],
  ['label: "Notifications",', 'label: t(\'sidebar.notifications\', "Notifications"),'],
  ['label: "Audit Logs",', 'label: t(\'sidebar.auditLogs\', "Audit Logs"),'],
  ['label: "Tenants",', 'label: t(\'sidebar.tenants\', "Tenants"),'],
  ['label: "Profile",', 'label: t(\'sidebar.profile\', "Profile"),']
];

for (const [oldStr, newStr] of replacements) {
    if(!content.includes(oldStr)) {
       console.warn('Could not find', oldStr);
    }
    content = content.replace(newStr, oldStr); // Revert first just in case
    content = content.replace(oldStr, newStr);
}

content = content.replace(/>\s*Sign Out\s*<\/button>/g, '>{t(\'sidebar.signOut\', \'Sign Out\')}</button>');

fs.writeFileSync(file, content, 'utf-8');
console.log('Sidebar updated successfully.');
