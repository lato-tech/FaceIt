import React, { useState, createContext, useContext } from 'react';
export type Language = 'en' | 'es' | 'fr' | 'de' | 'hi' | 'zh';
interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}
const translations: Translations = {
  en: {
    settings: 'Settings',
    home: 'Home',
    employees: 'Employees',
    logs: 'Attendance Logs',
    camera: 'Camera Setup',
    system: 'System Settings',
    faceRegistration: 'Face Registration'
    // Add more translations as needed
  },
  es: {
    settings: 'Ajustes',
    home: 'Inicio',
    employees: 'Empleados',
    logs: 'Registros de Asistencia',
    camera: 'Configuración de Cámara',
    system: 'Configuración del Sistema',
    faceRegistration: 'Registro Facial'
  }
  // Add more languages
};
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}
const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key
});
export function LanguageProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [language, setLanguage] = useState<Language>('en');
  const t = (key: string): string => {
    return translations[language]?.[key] || translations['en'][key] || key;
  };
  return <LanguageContext.Provider value={{
    language,
    setLanguage,
    t
  }}>
      {children}
    </LanguageContext.Provider>;
}
export function useLanguage() {
  return useContext(LanguageContext);
}