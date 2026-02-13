import React from 'react';
import ReactDOM from 'react-dom/client';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import App from './App';

import ptTranslations from './i18n/pt.json';
import enTranslations from './i18n/en.json';

i18n.use(initReactI18next).init({
  resources: {
    pt: { translation: ptTranslations },
    en: { translation: enTranslations },
  },
  lng: 'pt',
  fallbackLng: 'pt',
  interpolation: { escapeValue: false },
});

// Mobile viewport wrapper styles (tokens from bctt-design-system)
const style = document.createElement('style');
style.textContent = `
  body {
    margin: 0;
    background-color: #E4E9F2;
    display: flex;
    justify-content: center;
    min-height: 100vh;
  }
  #root {
    width: 100%;
    max-width: 390px;
    min-height: 100vh;
    background-color: #F7F9FC;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
    position: relative;
    overflow-x: hidden;
  }
  @media (max-width: 390px) {
    #root {
      max-width: 100%;
      box-shadow: none;
    }
  }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
