import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      dashboard: 'Dashboard',
      login: 'Login',
      password: 'Password',
      username: 'Username',
      email: 'Email',
      accounts: 'Accounts',
      packages: 'Packages',
      domains: 'Domains',
      dns: 'DNS',
      emailModule: 'Email',
      databases: 'Databases',
      backups: 'Backups',
      ssl: 'SSL',
      files: 'Files',
      software: 'Software',
      logout: 'Logout'
    }
  },
  ar: {
    translation: {
      dashboard: 'لوحة التحكم',
      login: 'تسجيل الدخول',
      password: 'كلمة المرور',
      username: 'اسم المستخدم',
      email: 'البريد الإلكتروني',
      accounts: 'الحسابات',
      packages: 'الباقات',
      domains: 'الدومينات',
      dns: 'DNS',
      emailModule: 'البريد',
      databases: 'قواعد البيانات',
      backups: 'النسخ الاحتياطي',
      ssl: 'SSL',
      files: 'الملفات',
      software: 'البرمجيات',
      logout: 'تسجيل الخروج'
    }
  }
} as const;

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('hostmaster.locale') ?? 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
});

export { i18n };
