const fs = require('fs');

const file = 'frontend/src/app/page.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Replace these long strings with the translation hooks
const replacements = [
  [
    `Replace WhatsApp chains and paper registers with one accountable
              system — where every grievance is captured, AI-prioritised, and
              closed on time.`,
    `{t('landing.replaceWhatsapp')}`
  ],
  [
    `File a complaint`,
    `{t('landing.fileComplaint')}`
  ],
  [
    `Real-time complaint overview`,
    `{t('landing.realTimeOverview')}`
  ],
  [
    `Lifecycle pipeline`,
    `{t('landing.lifecyclePipeline')}`
  ],
  [
    `Four steps. Full accountability.`,
    `{t('landing.fourSteps')}`
  ],
  [
    `No login. No app. Just results.`,
    `{t('landing.noLogin')}`
  ],
  [
    `Three engines. Zero manual triage.`,
    `{t('landing.threeEngines')}`
  ],
  [
    `Everything a government office needs. Nothing it doesn't.`,
    `{t('landing.needsNothingElse')}`
  ],
  [
    `>Request access<`,
    `>{t('landing.requestAccess')}<`
  ],
  [
    `Without Bharat&#8209;Setu`,
    `{t('landing.withoutPlatform')}`
  ],
  [
    `With Bharat&#8209;Setu`,
    `{t('landing.withPlatform')}`
  ]
];

for (const [oldStr, newStr] of replacements) {
    if(!content.includes(oldStr)) {
        // Fallback for some formatted strings
        const slim = oldStr.replace(/\s+/g, ' ');
        // If exact match didn't work because of indentation, we can try regex
        if (oldStr === `Without Bharat&#8209;Setu`) {
            content = content.replace(/Without Bharat&#8209;Setu/g, newStr);
        } else if (oldStr === `With Bharat&#8209;Setu`) {
            content = content.replace(/With Bharat&#8209;Setu/g, newStr);
        } else if (oldStr === `>Request access<`) {
            content = content.replace(/>Request access</g, newStr);
        } else if (oldStr === `Everything a government office needs. Nothing it doesn't.`) {
            // Need to escape ' correctly
            content = content.replace(/Everything a government office needs\. Nothing it doesn&apos;t\./g, newStr);
        } else {
             // Not found simply
        }
    } else {
        content = content.replace(oldStr, newStr);
    }
}

// Deal with some that have HTML entities
content = content.replace(/Everything a government office needs\. Nothing it doesn&apos;t\./g, `{t('landing.needsNothingElse')}`);

// Regex based for wrapped texts
content = content.replace(/Replace WhatsApp chains and paper registers with one accountable[\s\S]*?closed on time\./, `{t('landing.replaceWhatsapp')}`);
content = content.replace(/Phone calls, walk-ins, registers, sticky notes, group chats —[\s\S]*?There is no single source of truth\./, `{t('landing.scatteredProblem')}`);
content = content.replace(/Each constituency or department operates in a completely isolated data environment\. One platform serves dozens of offices with zero data crossover and independent configuration\./g, `{t('landing.multiOfficeDesc')}`);
content = content.replace(/Every new complaint is scored automatically before staff see it[\s\S]*?not the bottom of the queue\./g, `{t('landing.aiScored')}`);
content = content.replace(/Citizens don&apos;t need an account to file, track, or rate\.[\s\S]*?available from any browser, on any device\./g, `{t('landing.citizenAccess')}`);

// Titles
content = content.replace(/"Multi-office isolation"/g, `t('landing.multiOffice')`);
content = content.replace(/title: "Citizen rates & closes"/g, `title: t('landing.citizenRates', 'Citizen rates & closes')`);

// Table/Card Labels
content = content.replace(/>Incoming complaint</g, `>{t('landing.incomingComplaint')}<`);
content = content.replace(/>Description</g, `>{t('landing.descriptionLabel')}<`);
content = content.replace(/>Category</g, `>{t('landing.categoryLabel')}<`);
content = content.replace(/>Filed by</g, `>{t('landing.filedByLabel')}<`);
content = content.replace(/>Status</g, `>{t('landing.statusLabel')}<`);
content = content.replace(/>Department</g, `>{t('landing.departmentLabel')}<`);
content = content.replace(/>Assigned to</g, `>{t('landing.assignedToLabel')}<`);
content = content.replace(/>SLA deadline</g, `>{t('landing.slaDeadlineLabel')}<`);
content = content.replace(/>Lifecycle pipeline</g, `>{t('landing.lifecyclePipeline')}<`);


fs.writeFileSync(file, content, 'utf-8');
console.log('page.tsx replaced with keys.');
