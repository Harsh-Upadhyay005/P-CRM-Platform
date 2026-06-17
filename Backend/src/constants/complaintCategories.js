/**
 * 43 Predefined Complaint Categories
 * Each category has key (for DB/API), label (English), hindiLabel (Hindi)
 */
export const COMPLAINT_CATEGORIES = [
  { key: 'WATER_SUPPLY', label: 'Water Supply Issues', hindiLabel: 'जल आपूर्ति समस्या' },
  { key: 'ELECTRICITY', label: 'Electricity Problems', hindiLabel: 'बिजली की समस्या' },
  { key: 'ROADS', label: 'Road Maintenance', hindiLabel: 'सड़क रखरखाव' },
  { key: 'DRAINAGE', label: 'Drainage & Sewerage', hindiLabel: 'जल निकासी और सीवरेज' },
  { key: 'GARBAGE', label: 'Garbage Collection', hindiLabel: 'कचरा संग्रहण' },
  { key: 'STREET_LIGHTS', label: 'Street Lights', hindiLabel: 'सड़क की बत्तियाँ' },
  { key: 'NOISE_POLLUTION', label: 'Noise Pollution', hindiLabel: 'ध्वनि प्रदूषण' },
  { key: 'AIR_POLLUTION', label: 'Air Pollution', hindiLabel: 'वायु प्रदूषण' },
  { key: 'WATER_POLLUTION', label: 'Water Pollution', hindiLabel: 'जल प्रदूषण' },
  { key: 'TRAFFIC', label: 'Traffic Issues', hindiLabel: 'यातायात समस्या' },
  { key: 'PARKING', label: 'Parking Problems', hindiLabel: 'पार्किंग समस्या' },
  { key: 'PUBLIC_TRANSPORT', label: 'Public Transport', hindiLabel: 'सार्वजनिक परिवहन' },
  { key: 'STRAY_ANIMALS', label: 'Stray Animals', hindiLabel: 'आवारा पशु' },
  { key: 'PARKS', label: 'Parks & Gardens', hindiLabel: 'पार्क और उद्यान' },
  { key: 'BUILDING_SAFETY', label: 'Building Safety', hindiLabel: 'भवन सुरक्षा' },
  { key: 'ILLEGAL_CONSTRUCTION', label: 'Illegal Construction', hindiLabel: 'अवैध निर्माण' },
  { key: 'ENCROACHMENT', label: 'Encroachment', hindiLabel: 'अतिक्रमण' },
  { key: 'PUBLIC_TOILETS', label: 'Public Toilets', hindiLabel: 'सार्वजनिक शौचालय' },
  { key: 'POTHOLES', label: 'Potholes', hindiLabel: 'गड्ढे' },
  { key: 'MOSQUITOES', label: 'Mosquitoes & Insects', hindiLabel: 'मच्छर और कीड़े' },
  { key: 'TAX_ISSUES', label: 'Tax Related Issues', hindiLabel: 'कर संबंधी मुद्दे' },
  { key: 'BIRTH_CERTIFICATE', label: 'Birth Certificate', hindiLabel: 'जन्म प्रमाण पत्र' },
  { key: 'DEATH_CERTIFICATE', label: 'Death Certificate', hindiLabel: 'मृत्यु प्रमाण पत्र' },
  { key: 'RATION_CARD', label: 'Ration Card', hindiLabel: 'राशन कार्ड' },
  { key: 'PENSION', label: 'Pension Related', hindiLabel: 'पेंशन संबंधी' },
  { key: 'HEALTH_SERVICES', label: 'Health Services', hindiLabel: 'स्वास्थ्य सेवाएं' },
  { key: 'EDUCATION', label: 'Education Related', hindiLabel: 'शिक्षा संबंधी' },
  { key: 'POLICE', label: 'Police Related', hindiLabel: 'पुलिस संबंधी' },
  { key: 'FIRE_SAFETY', label: 'Fire Safety', hindiLabel: 'अग्नि सुरक्षा' },
  { key: 'FOOD_SAFETY', label: 'Food Safety', hindiLabel: 'खाद्य सुरक्षा' },
  { key: 'VENDOR_LICENSE', label: 'Vendor Licensing', hindiLabel: 'विक्रेता लाइसेंस' },
  { key: 'MARRIAGE_CERTIFICATE', label: 'Marriage Certificate', hindiLabel: 'विवाह प्रमाण पत्र' },
  { key: 'PROPERTY_TAX', label: 'Property Tax', hindiLabel: 'संपत्ति कर' },
  { key: 'TRADE_LICENSE', label: 'Trade License', hindiLabel: 'व्यापार लाइसेंस' },
  { key: 'CORRUPTION', label: 'Corruption Complaint', hindiLabel: 'भ्रष्टाचार की शिकायत' },
  { key: 'HARASSMENT', label: 'Harassment', hindiLabel: 'उत्पीड़न' },
  { key: 'DISABLED_FACILITIES', label: 'Disabled Facilities', hindiLabel: 'विकलांग सुविधाएं' },
  { key: 'WOMEN_SAFETY', label: 'Women Safety', hindiLabel: 'महिला सुरक्षा' },
  { key: 'CHILD_SAFETY', label: 'Child Safety', hindiLabel: 'बाल सुरक्षा' },
  { key: 'SENIOR_CITIZEN', label: 'Senior Citizen Issues', hindiLabel: 'वरिष्ठ नागरिक मुद्दे' },
  { key: 'UNEMPLOYMENT', label: 'Unemployment', hindiLabel: 'बेरोजगारी' },
  { key: 'OTHER_CIVIC', label: 'Other Civic Issues', hindiLabel: 'अन्य नागरिक मुद्दे' },
  { key: 'GENERAL', label: 'General Complaint', hindiLabel: 'सामान्य शिकायत' }
];

/**
 * Get category object by key
 * @param {string} key - Category key (e.g., 'WATER_SUPPLY')
 * @returns {object|undefined} Category object or undefined if not found
 */
export const getCategoryByKey = (key) => {
  return COMPLAINT_CATEGORIES.find(cat => cat.key === key);
};

/**
 * Validate if category key exists
 * @param {string} key - Category key to validate
 * @returns {boolean} True if valid category key
 */
export const isValidCategoryKey = (key) => {
  return COMPLAINT_CATEGORIES.some(cat => cat.key === key);
};

/**
 * Get categories with labels in specified language
 * @param {string} language - Language code ('en' or 'hi')
 * @returns {Array<{key: string, label: string}>} Array of categories with localized labels
 */
export const getCategoriesForLanguage = (language) => {
  const labelField = language === 'hi' ? 'hindiLabel' : 'label';
  return COMPLAINT_CATEGORIES.map(cat => ({
    key: cat.key,
    label: cat[labelField]
  }));
};
