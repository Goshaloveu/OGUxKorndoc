import {I18N} from '@gravity-ui/i18n';
import {useMemo} from 'react';
import {useThemeContext} from '../hooks/useTheme';
import type {AppLang} from '../hooks/useTheme';
import ru from './ru.json';
import en from './en.json';

type TranslationParams = Record<string, string | number>;

const data = {ru, en};

export const i18n = new I18N({
  lang: 'ru',
  fallbackLang: 'ru',
  data,
});

export function setI18nLang(lang: AppLang): void {
  i18n.setLang(lang);
}

export function translate(keyset: string, key: string, params?: TranslationParams): string {
  return i18n.i18n(keyset, key, params);
}

export function useTranslation(keyset: string): (key: string, params?: TranslationParams) => string {
  const {lang} = useThemeContext();

  return useMemo(() => {
    setI18nLang(lang);
    return (key: string, params?: TranslationParams) => translate(keyset, key, params);
  }, [keyset, lang]);
}
