import './App.css';

import { useEffect, useState } from 'react';
import { IntlProvider } from 'react-intl';

import Editor from './components/Editor';
import { appEventEmitter } from './events';
import { en, ru, type SupportedLocale, zh } from './locale';

const messageMap: Record<SupportedLocale, typeof en> = {
  zh,
  en,
  ru,
};

/** Prefer ?lang= from Herald, then stored preference, then browser. */
const getLocale = (): SupportedLocale => {
  const params = new URLSearchParams(location.search);
  const fromQuery = (params.get('lang') || '').toLowerCase().slice(0, 2);
  if (fromQuery === 'ru' || fromQuery === 'zh' || fromQuery === 'en') {
    localStorage.setItem('suika-locale', fromQuery);
    return fromQuery;
  }
  const stored = localStorage.getItem('suika-locale') || navigator.language;
  if (stored.startsWith('zh')) return 'zh';
  if (stored.startsWith('ru')) return 'ru';
  return 'en';
};

function App() {
  const [locale, setLocale] = useState(getLocale);

  useEffect(() => {
    const localeChangeHandler = (next: SupportedLocale) => {
      setLocale(next);
    };
    appEventEmitter.on('localeChange', localeChangeHandler);
    return () => {
      appEventEmitter.off('localeChange', localeChangeHandler);
    };
  }, []);

  return (
    <IntlProvider locale={locale} messages={messageMap[locale]}>
      <div className="suika">
        <Editor />
      </div>
    </IntlProvider>
  );
}

export default App;
