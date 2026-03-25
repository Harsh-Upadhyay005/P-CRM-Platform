const fs = require('fs');
const file = 'frontend/src/app/(auth)/register/page.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Add translation hook import
content = content.replace(/import { authApi } from '@\/lib\/api';/, "import { authApi } from '@/lib/api';\nimport { useTranslation } from 'react-i18next';");

// Add hook inside component
content = content.replace(/export default function SignupPage\(\) \{/, 'export default function SignupPage() {\n  const { t } = useTranslation();');

// Replacements
content = content.replace(/>\s*Home\s*<\/Link>/g, ">{t('auth.home', 'Home')}</Link>");
content = content.replace(/>Create Account<\/h2>/g, ">{t('auth.createAccount', 'Create Account')}</h2\>");
content = content.replace(/>Join BharatSetu Portal<\/p>/g, ">{t('auth.joinPortal', 'Join BharatSetu Portal')}</p\>");
content = content.replace(/>Full Name<\/label>/g, ">{t('auth.fullName', 'Full Name')}</label\>");
content = content.replace(/placeholder="John Doe"/g, "placeholder={t('auth.fullNamePlaceholder', 'John Doe')}");
content = content.replace(/>Email Address<\/label>/g, ">{t('auth.emailAddress', 'Email Address')}</label\>");
content = content.replace(/placeholder="john@example\.com"/g, "placeholder={t('auth.emailPlaceholder', 'john@example.com')}");
content = content.replace(/>Password<\/label>/g, ">{t('auth.password', 'Password')}</label\>");
content = content.replace(/placeholder="••••••••"/g, "placeholder={t('auth.passwordPlaceholder', '••••••••')}");
content = content.replace(/>Select Department<\/label>/g, ">{t('auth.selectDepartment', 'Select Department')}</label\>");
content = content.replace(/>Loading departments\.\.\.<\/span>/g, ">{t('auth.loadingDepartments', 'Loading departments...')}</span\>");
content = content.replace(/>Select a department<\/option>/g, ">{t('auth.selectADepartment', 'Select a department')}</option\>");
content = content.replace(/>Creating account\.\.\.<\/span>/g, ">{t('auth.creatingAccount', 'Creating account...')}</span\>");

// Only replace exact raw text for Create Account btn
content = content.replace(/>Create Account<\/span>/g, ">{t('auth.createAccountBtn', 'Create Account')}</span\>");

content = content.replace(/>Registration successful! Redirecting to login\.\.\.<\/h3>/g, ">{t('auth.registrationSuccess', 'Registration successful! Redirecting to login...')}</h3\>");
content = content.replace(/>Already have an account\?<\/span>/g, ">{t('auth.alreadyHaveAccount', 'Already have an account?')}</span\>");
content = content.replace(/>Sign in<\/span>/g, ">{t('auth.signInBtn', 'Sign in')}</span\>");

fs.writeFileSync(file, content, 'utf-8');
console.log('Register page updated successfully.');
