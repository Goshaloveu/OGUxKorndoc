import { createContext, useContext } from 'react';

export type Theme = 'light' | 'dark';
export type AppLang = 'ru' | 'en';

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  lang: AppLang;
  setLang: (l: AppLang) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
  lang: 'ru',
  setLang: () => {},
});

export function useThemeContext(): ThemeContextValue {
  return useContext(ThemeContext);
}
