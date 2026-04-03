import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, ToasterComponent, configure, Lang } from '@gravity-ui/uikit';
import { ToasterProvider } from '@gravity-ui/uikit';
import { toaster } from '@gravity-ui/uikit/toaster-singleton';
import { settings } from '@gravity-ui/date-utils';
import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';
import './index.css';
import App from './App';
import { ThemeContext } from './hooks/useTheme';
import type { Theme, AppLang } from './hooks/useTheme';

const LANG_TO_GRAVITY: Record<AppLang, Lang> = {
  ru: Lang.Ru,
  en: Lang.En,
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const Root: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme) || 'dark',
  );

  const [lang, setLangRaw] = useState<AppLang>(
    () => (localStorage.getItem('lang') as AppLang) || 'ru',
  );

  const ctx = useMemo(
    () => ({
      theme,
      setTheme: (t: Theme) => {
        localStorage.setItem('theme', t);
        setTheme(t);
      },
      lang,
      setLang: (l: AppLang) => {
        localStorage.setItem('lang', l);
        settings
          .loadLocale(l)
          .then(() => {
            settings.setLocale(l);
            configure({ lang: LANG_TO_GRAVITY[l] ?? Lang.En });
            setLangRaw(l);
          })
          .catch(() => {
            configure({ lang: LANG_TO_GRAVITY[l] ?? Lang.En });
            setLangRaw(l);
          });
      },
    }),
    [theme, lang],
  );

  return (
    <React.StrictMode>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ThemeContext.Provider value={ctx}>
            <ThemeProvider key={lang} theme={theme}>
              <ToasterProvider toaster={toaster}>
                <App />
                <ToasterComponent />
              </ToasterProvider>
            </ThemeProvider>
          </ThemeContext.Provider>
        </QueryClientProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
};

const initLang: AppLang = (localStorage.getItem('lang') as AppLang) || 'ru';

async function bootstrap() {
  try {
    await settings.loadLocale(initLang);
    settings.setLocale(initLang);
  } catch {
    // fallback to English if locale load fails
  }
  configure({ lang: LANG_TO_GRAVITY[initLang] ?? Lang.En });
  ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
}

bootstrap();
