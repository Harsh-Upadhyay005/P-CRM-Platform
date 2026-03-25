const fs = require('fs');

const file = 'frontend/src/app/page.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Replace these long strings with the translation hooks
const replacements = [
  [
    `Phone calls, walk-ins, registers, sticky notes, group chats —
                everything ends up scattered across people, and when someone
                leaves, the knowledge leaves too. There is no single source of
                truth.`,
    `{t('landing.scatteredSources')}`
  ],
  [
    `Every new complaint is scored automatically before staff see it
                — so critical cases surface to the top, not the bottom of the
                queue.`,
    `{t('landing.autoScored')}`
  ],
  [
    `&ldquo;Water supply has been cut for 3 days in Block
                          12. Children are sick. Multiple families affected.
                          Nobody is responding to our calls.&rdquo;`,
    `{t('landing.complaintExample')}`
  ],
  [
    `Every detail. Every time.`,
    `{t('landing.everyDetail')}`
  ],
  [
    `Built for accountability, not just tracking.`,
    `{t('landing.accountabilityFirst')}`
  ],
  [
    `Five roles. One clear hierarchy.`,
    `{t('landing.fiveRoles')}`
  ],
  [
    `Why not a generic helpdesk`,
    `{t('landing.whyNotHelpdesk')}`
  ],
  [
    `Government work requires government-grade tools.`,
    `{t('landing.govGradeTools')}`
  ],
  [
    `Ready to bring accountability`,
    `{t('landing.readyToBring')}`
  ],
  [
    `Citizens — no account needed`,
    `{t('landing.citizensNoAccount')}`
  ],
  [
    `Every user sees exactly what they need — nothing more. Role
                scopes are enforced in code, not policy.`,
     `{t('landing.roleScopes')}`
  ],
  [
    `Modern grievance management for government offices —
                  accountable, transparent, AI-powered.`,
    `{t('landing.modernGrievance')}`
  ]
];

for (const [oldStr, newStr] of replacements) {
    if(!content.includes(oldStr)) {
         // Fallback via regex if formatting doesn't exactly match
    } else {
        content = content.replace(oldStr, newStr);
    }
}

// Regex fallback for array props
content = content.replace(/"TF-IDF cosine similarity against recent complaints in the same tenant\. Flags near-duplicates for staff review[^\"]*"/g, `t('landing.duplicateDetail')`);
content = content.replace(/"Same pothole filed 8 times → flagged as duplicate cluster"/g, `t('landing.duplicateExample')`);

content = content.replace(/"Citizen submits a 1–5 satisfaction rating using only their tracking ID\. Aggregated into the analytics dashboard[^\"]*"/g, `t('landing.citizenRatesDesc')`);
content = content.replace(/"Once resolved, submit a 1–5 satisfaction rating and comment\. This data flows directly into the leadership analytics dashboard\."/g, `t('landing.rateServiceDesc')`);

content = content.replace(/"Every status transition — who changed what, from what, to what, at what time — is written atomically to the database[^\"]*"/g, `t('landing.immutableAudit')`);
content = content.replace(/"Full chronological record survives any personnel change\."/g, `t('landing.chronologicalRecord')`);

fs.writeFileSync(file, content, 'utf-8');
console.log('page.tsx replaced with more paragraphs.');
