const fs = require('fs');

const updateLocale = (path, updates) => {
  const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
  data.landing = { ...data.landing, ...updates };
  fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
};

const enUpdates = {
  complaintsWhatsapp: 'Complaints live in WhatsApp.',
  scatteredSources: 'Phone calls, walk-ins, registers, sticky notes, group chats — everything ends up scattered across people, and when someone leaves, the knowledge leaves too. There is no single source of truth.',
  autoScored: 'Every new complaint is scored automatically before staff see it — so critical cases surface to the top, not the bottom of the queue.',
  complaintExample: '“Water supply has been cut for 3 days in Block 12. Children are sick. Multiple families affected. Nobody is responding to our calls.”',
  duplicateDetail: 'TF-IDF cosine similarity against recent complaints in the same tenant. Flags near-duplicates for staff review — saves officer time, gives leaders accurate counts.',
  duplicateExample: 'Same pothole filed 8 times → flagged as duplicate cluster',
  citizenRatesDesc: 'Citizen submits a 1–5 satisfaction rating using only their tracking ID. Aggregated into the analytics dashboard. Immutable audit trail preserved permanently.',
  rateServiceDesc: 'Once resolved, submit a 1–5 satisfaction rating and comment. This data flows directly into the leadership analytics dashboard.',
  everyDetail: 'Every detail. Every time.',
  accountabilityFirst: 'Built for accountability, not just tracking.',
  immutableAudit: 'Every status transition — who changed what, from what, to what, at what time — is written atomically to the database. Court-admissible, irreversible, always on.',
  chronologicalRecord: 'Full chronological record survives any personnel change.',
  fiveRoles: 'Five roles. One clear hierarchy.',
  roleScopes: 'Every user sees exactly what they need — nothing more. Role scopes are enforced in code, not policy.',
  whyNotHelpdesk: 'Why not a generic helpdesk',
  govGradeTools: 'Government work requires government-grade tools.',
  readyToBring: 'Ready to bring accountability',
  citizensNoAccount: 'Citizens — no account needed',
  modernGrievance: 'Modern grievance management for government offices — accountable, transparent, AI-powered.'
};

const hiUpdates = {
  complaintsWhatsapp: 'शिकायतें व्हाट्सएप में रहती हैं।',
  scatteredSources: 'फोन कॉल, वॉक-इन, रजिस्टर, स्टिकी नोट्स, ग्रुप चैट — सबकुछ बिखर जाता है, और जब कोई काम छोड़ता है, तो जानकारी भी चली जाती है। सच्चाई का कोई एक स्रोत नहीं है।',
  autoScored: 'हर नई शिकायत को कर्मचारियों के देखने से पहले ऑटोमेटिक स्कोर किया जाता है — ताकि महत्वपूर्ण मामले ऊपर आएं, न कि कतार के नीचे रहें।',
  complaintExample: '“ब्लॉक 12 में 3 दिनों से पानी की आपूर्ति बंद है। बच्चे बीमार हैं। कई परिवार प्रभावित हैं। कोई भी हमारी कॉल का जवाब नहीं दे रहा है।”',
  duplicateDetail: 'समान किरायेदार में हाल की शिकायतों के खिलाफ TF-IDF कोसाइन समानता। कर्मचारियों की समीक्षा के लिए नज़दीकी डुप्लिकेट को फ़्लैग करता है — अधिकारी का समय बचाता है, नेताओं को सटीक संख्या देता है।',
  duplicateExample: 'एक ही गड्ढा 8 बार दायर किया गया → डुप्लिकेट क्लस्टर के रूप में फ़्लैग किया गया',
  citizenRatesDesc: 'नागरिक केवल अपनी ट्रैकिंग आईडी का उपयोग करके 1-5 संतुष्टि रेटिंग सबमिट करता है। एनालिटिक्स डैशबोर्ड में एकत्रित। अपरिवर्तनीय ऑडिट ट्रेल स्थायी रूप से संरक्षित।',
  rateServiceDesc: 'समाधान होने के बाद 1–5 संतुष्टि रेटिंग और टिप्पणी सबमिट करें। यह डेटा सीधे नेतृत्व एनालिटिक्स डैशबोर्ड में प्रवाहित होता है।',
  everyDetail: 'हर विवरण। हर बार।',
  accountabilityFirst: 'सिर्फ ट्रैकिंग के लिए नहीं, जवाबदेही के लिए बनाया गया है।',
  immutableAudit: 'हर स्थिति संक्रमण — किसने क्या, किससे, क्या, किस समय बदला — डेटाबेस में स्वचालित रूप से लिखा गया है। अदालत-स्वीकार्य, अपरिवर्तनीय, हमेशा चालू।',
  chronologicalRecord: 'पूर्ण कालानुक्रमिक रिकॉर्ड कार्यालय में किसी भी बदलाव पर जीवित रहता है।',
  fiveRoles: 'पांच भूमिकाएँ। एक स्पष्ट पदानुक्रम।',
  roleScopes: 'हर उपयोगकर्ता वही देखता है जो उन्हें चाहिए — और कुछ नहीं। भूमिका का दायरा केवल नीति में नहीं बल्कि कोड में लागू होता है।',
  whyNotHelpdesk: 'जेनेरिक हेल्पडेस्क क्यों नहीं?',
  govGradeTools: 'सरकारी काम में सरकारी स्तर के उपकरण चाहिए।',
  readyToBring: 'जवाबदेही लाने के लिए तैयार',
  citizensNoAccount: 'नागरिकों को खाते की जरूरत नहीं',
  modernGrievance: 'सरकारी कार्यालयों के लिए आधुनिक शिकायत प्रबंधन — जवाबदेह, पारदर्शी, AI-संचालित।'
};

updateLocale('frontend/public/locales/en/common.json', enUpdates);
updateLocale('frontend/public/locales/hi/common.json', hiUpdates);
console.log('JSON translations updated with even more paragraphs');
