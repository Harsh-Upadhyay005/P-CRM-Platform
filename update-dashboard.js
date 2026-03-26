const fs = require('fs');
const file = 'frontend/src/app/(protected)/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf-8');


content = content.replace(/import \{ useRole \} from "@\/hooks\/useRole";/, "import { useRole } from \"@/hooks/useRole\";\nimport { useTranslation } from 'react-i18next';");


content = content.replace(/export default function Dashboard\(\) \{/, 'export default function Dashboard() {\n  const { t } = useTranslation();');


content = content.replace(/>\s*National Command Center\s*<\/h1>/, "> {t('dashboard.commandCenter', 'National Command Center')} </h1>");
content = content.replace(/Real-time overview of citizen complaints, team activity, and\s*analytics\./, "{t('dashboard.subtitle', 'Real-time overview of citizen complaints, team activity, and analytics.')}");
content = content.replace(/>\s*LIVE\s*<\/span>/, ">{t('dashboard.live', 'LIVE')}</span\>");

fs.writeFileSync(file, content, 'utf-8');
console.log('Dashboard page updated!');