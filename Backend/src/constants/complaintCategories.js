/**
 * Complaint Categories for P-CRM Platform
 * Maps 43 bilingual categories to department slugs
 */

export const COMPLAINT_CATEGORIES = [
  // Infrastructure & Urban Development
  { id: 1, en: 'Road Repair', hi: 'सड़क मरम्मत', department: 'PWD', severity: 'L2' },
  { id: 2, en: 'Pothole', hi: 'गड्ढा', department: 'PWD', severity: 'L3' },
  { id: 3, en: 'Street Light', hi: 'स्ट्रीट लाइट', department: 'PWD', severity: 'L2' },
  { id: 4, en: 'Drainage Issue', hi: 'नाली समस्या', department: 'PWD', severity: 'L2' },
  { id: 5, en: 'Water Logging', hi: 'जल जमाव', department: 'PWD', severity: 'L4' },
  
  // Sanitation & Cleanliness
  { id: 6, en: 'Garbage Collection', hi: 'कचरा संग्रहण', department: 'MCD', severity: 'L3' },
  { id: 7, en: 'Open Garbage Dump', hi: 'खुला कचरा', department: 'MCD', severity: 'L3' },
  { id: 8, en: 'Public Toilet Maintenance', hi: 'सार्वजनिक शौचालय रखरखाव', department: 'MCD', severity: 'L2' },
  { id: 9, en: 'Sewage Overflow', hi: 'सीवेज ओवरफ्लो', department: 'DJB', severity: 'L4' },
  { id: 10, en: 'Stray Animals', hi: 'आवारा जानवर', department: 'MCD', severity: 'L1' },
  
  // Water Supply
  { id: 11, en: 'Water Supply Issue', hi: 'जल आपूर्ति समस्या', department: 'DJB', severity: 'L3' },
  { id: 12, en: 'Water Quality', hi: 'पानी की गुणवत्ता', department: 'DJB', severity: 'L4' },
  { id: 13, en: 'Water Pipeline Leakage', hi: 'पानी का पाइप लीकेज', department: 'DJB', severity: 'L3' },
  { id: 14, en: 'No Water Supply', hi: 'पानी नहीं आ रहा', department: 'DJB', severity: 'L4' },
  
  // Electricity
  { id: 15, en: 'Power Outage', hi: 'बिजली कटौती', department: 'ELECTRICITY', severity: 'L3' },
  { id: 16, en: 'Electric Pole Damage', hi: 'बिजली का खंभा क्षतिग्रस्त', department: 'ELECTRICITY', severity: 'L4' },
  { id: 17, en: 'Transformer Issue', hi: 'ट्रांसफार्मर समस्या', department: 'ELECTRICITY', severity: 'L3' },
  { id: 18, en: 'Electric Wire Hanging', hi: 'बिजली का तार लटका', department: 'ELECTRICITY', severity: 'L4' },
  
  // Traffic & Transport
  { id: 19, en: 'Traffic Signal Not Working', hi: 'ट्रैफिक सिग्नल काम नहीं कर रहा', department: 'TRAFFIC', severity: 'L4' },
  { id: 20, en: 'Illegal Parking', hi: 'अवैध पार्किंग', department: 'TRAFFIC', severity: 'L1' },
  { id: 21, en: 'Road Encroachment', hi: 'सड़क अतिक्रमण', department: 'MCD', severity: 'L2' },
  { id: 22, en: 'Metro Service Issue', hi: 'मेट्रो सेवा समस्या', department: 'DMRC', severity: 'L3' },
  { id: 23, en: 'DTC Bus Service', hi: 'डीटीसी बस सेवा', department: 'DTC', severity: 'L2' },
  
  // Environment & Parks
  { id: 24, en: 'Air Pollution', hi: 'वायु प्रदूषण', department: 'DPCC', severity: 'L2' },
  { id: 25, en: 'Noise Pollution', hi: 'ध्वनि प्रदूषण', department: 'DPCC', severity: 'L1' },
  { id: 26, en: 'Park Maintenance', hi: 'पार्क रखरखाव', department: 'HORTICULTURE', severity: 'L1' },
  { id: 27, en: 'Tree Cutting Without Permission', hi: 'अनधिकृत पेड़ काटना', department: 'HORTICULTURE', severity: 'L3' },
  { id: 28, en: 'Tree Fallen', hi: 'पेड़ गिर गया', department: 'HORTICULTURE', severity: 'L4' },
  
  // Public Services
  { id: 29, en: 'Ration Card Issue', hi: 'राशन कार्ड समस्या', department: 'FOOD_SUPPLY', severity: 'L2' },
  { id: 30, en: 'Birth/Death Certificate', hi: 'जन्म/मृत्यु प्रमाण पत्र', department: 'MCD', severity: 'L2' },
  { id: 31, en: 'Property Tax', hi: 'संपत्ति कर', department: 'MCD', severity: 'L1' },
  { id: 32, en: 'Building Plan Approval', hi: 'भवन योजना स्वीकृति', department: 'MCD', severity: 'L1' },
  
  // Law & Order
  { id: 33, en: 'Public Safety', hi: 'सार्वजनिक सुरक्षा', department: 'POLICE', severity: 'L4' },
  { id: 34, en: 'Anti-Social Activity', hi: 'असामाजिक गतिविधि', department: 'POLICE', severity: 'L3' },
  { id: 35, en: 'Illegal Construction', hi: 'अवैध निर्माण', department: 'MCD', severity: 'L2' },
  
  // Health & Education
  { id: 36, en: 'Hospital Service', hi: 'अस्पताल सेवा', department: 'HEALTH', severity: 'L3' },
  { id: 37, en: 'Ambulance Service', hi: 'एम्बुलेंस सेवा', department: 'HEALTH', severity: 'L4' },
  { id: 38, en: 'School Infrastructure', hi: 'स्कूल बुनियादी ढांचा', department: 'EDUCATION', severity: 'L2' },
  { id: 39, en: 'Mid-Day Meal', hi: 'मध्याह्न भोजन', department: 'EDUCATION', severity: 'L2' },
  
  // Others
  { id: 40, en: 'Street Vendor Encroachment', hi: 'स्ट्रीट वेंडर अतिक्रमण', department: 'MCD', severity: 'L2' },
  { id: 41, en: 'Slum Rehabilitation', hi: 'झुग्गी पुनर्वास', department: 'SLUM_REHAB', severity: 'L1' },
  { id: 42, en: 'Women Safety', hi: 'महिला सुरक्षा', department: 'POLICE', severity: 'L4' },
  { id: 43, en: 'Other/General', hi: 'अन्य/सामान्य', department: 'GENERAL', severity: 'L2' }
];

/**
 * Get category by ID
 */
export function getCategoryById(id) {
  return COMPLAINT_CATEGORIES.find(cat => cat.id === id);
}

/**
 * Get category by English name
 */
export function getCategoryByName(name) {
  const lowerName = name.toLowerCase();
  return COMPLAINT_CATEGORIES.find(
    cat => cat.en.toLowerCase() === lowerName || cat.hi === name
  );
}

/**
 * Search categories by text (fuzzy match)
 */
export function searchCategories(query) {
  const lowerQuery = query.toLowerCase();
  return COMPLAINT_CATEGORIES.filter(
    cat => 
      cat.en.toLowerCase().includes(lowerQuery) || 
      cat.hi.includes(query) ||
      cat.department.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get all categories formatted for Gemini prompt
 */
export function getCategoriesForPrompt() {
  return COMPLAINT_CATEGORIES.map(cat => 
    `${cat.id}. ${cat.en} (${cat.hi}) - ${cat.department} - ${cat.severity}`
  ).join('\n');
}

/**
 * Get categories formatted by language for display
 */
export function getCategoriesForLanguage(language = 'en') {
  return COMPLAINT_CATEGORIES.map(cat => ({
    id: cat.id,
    name: language === 'hi' ? cat.hi : cat.en,
    department: cat.department,
    severity: cat.severity
  }));
}

/**
 * Department slug mapping (ensure consistency with database)
 */
export const DEPARTMENT_SLUGS = {
  PWD: 'public-works',
  MCD: 'municipal-corporation',
  DJB: 'water-board',
  ELECTRICITY: 'electricity-board',
  TRAFFIC: 'traffic-police',
  DMRC: 'metro-rail',
  DTC: 'transport-corporation',
  DPCC: 'pollution-control',
  HORTICULTURE: 'horticulture',
  FOOD_SUPPLY: 'food-supply',
  POLICE: 'police',
  HEALTH: 'health-department',
  EDUCATION: 'education-department',
  SLUM_REHAB: 'slum-rehabilitation',
  GENERAL: 'general-admin'
};
