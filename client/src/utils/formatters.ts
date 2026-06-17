import { Language } from '../i18n/LanguageContext';

export const localeByLanguage: Record<Language, string> = {
  fa: 'fa-AF',
  ps: 'ps-AF',
  en: 'en-US',
};

const toNumeric = (value: number | string | null | undefined) => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

export const formatNumberByLanguage = (
  value: number | string | null | undefined,
  language: Language
) => new Intl.NumberFormat(localeByLanguage[language]).format(toNumeric(value));

export const formatCurrencyByLanguage = (
  value: number | string | null | undefined,
  language: Language
) => {
  const formatted = formatNumberByLanguage(value, language);
  return language === 'en' ? `${formatted} AF` : `${formatted} افغانی`;
};

const normalizeDateTimeFormatOptions = (
  options: Intl.DateTimeFormatOptions = {}
): Intl.DateTimeFormatOptions => {
  const normalized: Intl.DateTimeFormatOptions = { ...options };

  if (options.dateStyle) {
    switch (options.dateStyle) {
      case 'short':
        normalized.year = '2-digit';
        normalized.month = 'numeric';
        normalized.day = 'numeric';
        break;
      case 'medium':
        normalized.year = 'numeric';
        normalized.month = 'short';
        normalized.day = 'numeric';
        break;
      case 'long':
      case 'full':
        normalized.year = 'numeric';
        normalized.month = 'long';
        normalized.day = 'numeric';
        break;
    }
    delete normalized.dateStyle;
  }

  if (options.timeStyle) {
    switch (options.timeStyle) {
      case 'short':
        normalized.hour = 'numeric';
        normalized.minute = '2-digit';
        break;
      case 'medium':
      case 'long':
      case 'full':
        normalized.hour = 'numeric';
        normalized.minute = '2-digit';
        normalized.second = '2-digit';
        break;
    }
    delete normalized.timeStyle;
  }

  return normalized;
};

export const formatDateByLanguage = (
  value: string | Date | null | undefined,
  language: Language,
  options?: Intl.DateTimeFormatOptions
) => {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat(localeByLanguage[language], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...normalizeDateTimeFormatOptions(options),
  }).format(date);
};

export const getCurrencyAddonByLanguage = (language: Language) =>
  language === 'en' ? 'AF' : 'افغانی';
