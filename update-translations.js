const fs = require('fs');

const updateLocale = (path, updates) => {
  const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
  data.landing = { ...data.landing, ...updates };
  fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
};

const enUpdates = {
  replaceWhatsapp: 'Replace WhatsApp chains and paper registers with one accountable system — where every grievance is captured, AI-prioritised, and closed on time.',
  fileComplaint: 'File a complaint',
  realTimeOverview: 'Real-time complaint overview',
  lifecyclePipeline: 'Lifecycle pipeline',
  scatteredProblem: 'Phone calls, walk-ins, registers, sticky notes, group chats — everything ends up scattered across people, and when someone leaves, the knowledge leaves too. There is no single source of truth.',
  withoutPlatform: 'Without Bharat-Setu',
  withPlatform: 'With Bharat-Setu',
  needsNothingElse: 'Everything a government office needs. Nothing it doesn\'t.',
  multiOffice: 'Multi-office isolation',
  multiOfficeDesc: 'Each constituency or department operates in a completely isolated data environment. One platform serves dozens of offices with zero data crossover and independent configuration.',
  threeEngines: 'Three engines. Zero manual triage.',
  aiScored: 'Every new complaint is scored automatically before staff see it — so critical cases surface to the top, not the bottom of the queue.',
  incomingComplaint: 'Incoming complaint',
  descriptionLabel: 'Description',
  categoryLabel: 'Category',
  filedByLabel: 'Filed by',
  statusLabel: 'Status',
  departmentLabel: 'Department',
  assignedToLabel: 'Assigned to',
  slaDeadlineLabel: 'SLA deadline',
  fourSteps: 'Four steps. Full accountability.',
  noLogin: 'No login. No app. Just results.',
  citizenAccess: 'Citizens don\'t need an account to file, track, or rate. Three actions — available from any browser, on any device.',
  requestAccess: 'Request access'
};

const hiUpdates = {
  replaceWhatsapp: 'व्हाट्सएप चेन और पेपर रजिस्टर को एक जवाबदेह प्रणाली से बदलें — जहां हर शिकायत दर्ज होती है, AI द्वारा प्राथमिकता दी जाती है और समय पर बंद की जाती है।',
  fileComplaint: 'शिकायत दर्ज करें',
  realTimeOverview: 'वास्तविक समय शिकायत अवलोकन',
  lifecyclePipeline: 'जीवनचक्र पाइपलाइन',
  scatteredProblem: 'फोन कॉल, वॉक-इन, रजिस्टर, स्टिकी नोट्स, ग्रुप चैट — सबकुछ बिखर जाता है, और जब कोई काम छोड़ता है, तो जानकारी भी चली जाती है। सच्चाई का कोई एक स्रोत नहीं है।',
  withoutPlatform: 'भारत-सेतु के बिना',
  withPlatform: 'भारत-सेतु के साथ',
  needsNothingElse: 'एक सरकारी कार्यालय को जो कुछ चाहिए। फालतू कुछ नहीं।',
  multiOffice: 'मल्टी-ऑफिस आइसोलेशन',
  multiOfficeDesc: 'प्रत्येक विभाग पूरी तरह से अलग डेटा वातावरण में काम करता है। एक प्लेटफ़ॉर्म शून्य डेटा क्रॉसओवर और स्वतंत्र कॉन्फ़िगरेशन के साथ दर्जनों कार्यालयों की सेवा करता है।',
  threeEngines: 'तीन इंजन। शून्य मैनुअल ट्राइएज।',
  aiScored: 'हर नई शिकायत को कर्मचारियों के देखने से पहले ऑटोमेटिक स्कोर किया जाता है — ताकि महत्वपूर्ण मामले ऊपर आएं, न कि कतार के नीचे रहें।',
  incomingComplaint: 'आने वाली शिकायत',
  descriptionLabel: 'विवरण',
  categoryLabel: 'श्रेणी',
  filedByLabel: 'किसके द्वारा दर्ज',
  statusLabel: 'स्थिति',
  departmentLabel: 'विभाग',
  assignedToLabel: 'किसे सौंपा गया',
  slaDeadlineLabel: 'SLA समय सीमा',
  fourSteps: 'चार कदम। पूरी जवाबदेही।',
  noLogin: 'कोई लॉगिन नहीं। कोई ऐप नहीं। सिर्फ परिणाम।',
  citizenAccess: 'नागरिकों को फाइल करने, ट्रैक करने या रेट करने के लिए किसी खाते की आवश्यकता नहीं है। तीन कार्य — किसी भी ब्राउज़र और किसी भी डिवाइस से उपलब्ध।',
  requestAccess: 'एक्सेस का अनुरोध करें'
};

updateLocale('frontend/public/locales/en/common.json', enUpdates);
updateLocale('frontend/public/locales/hi/common.json', hiUpdates);
console.log('JSON translations updated with more landing page details.');
