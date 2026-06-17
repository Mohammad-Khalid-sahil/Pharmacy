import { Language } from '../i18n/LanguageContext';
import { formatCurrencyByLanguage, formatDateByLanguage, formatNumberByLanguage } from './formatters';

export type DateRange = { from?: string; to?: string };
export type ReportSummaryItem = {
  label: string;
  value: number | string;
  type?: 'money' | 'number' | 'text';
};

export const formatReportNumber = (value: number | string | undefined, language: Language) =>
  formatNumberByLanguage(value, language);

export const formatReportMoney = (value: number | string | undefined, language: Language) =>
  formatCurrencyByLanguage(value, language);

export const formatSummaryValue = (item: ReportSummaryItem, language: Language) => {
  if (item.type === 'money') return formatReportMoney(item.value, language);
  if (item.type === 'number') return formatReportNumber(item.value, language);
  return item.value;
};

export const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

export const inRange = (value: string | Date | undefined, range: DateRange) => {
  if (!value || (!range.from && !range.to)) return true;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const itemTime = new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10))).getTime();
    if (range.from) {
      const fromTime = new Date(Number(range.from.slice(0, 4)), Number(range.from.slice(5, 7)) - 1, Number(range.from.slice(8, 10))).getTime();
      if (itemTime < fromTime) return false;
    }
    if (range.to) {
      const toTime = new Date(Number(range.to.slice(0, 4)), Number(range.to.slice(5, 7)) - 1, Number(range.to.slice(8, 10)), 23, 59, 59).getTime();
      if (itemTime > toTime) return false;
    }
    return true;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  if (range.from && d < new Date(`${range.from}T00:00:00`)) return false;
  if (range.to && d > new Date(`${range.to}T23:59:59`)) return false;
  return true;
};

const isoWeekStartEnd = (year: number, week: number) => {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dayOfWeek = simple.getDay();
  const start = new Date(simple);
  if (dayOfWeek <= 4) start.setDate(simple.getDate() - dayOfWeek + 1);
  else start.setDate(simple.getDate() + 8 - dayOfWeek);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const periodBounds = (item: { year: number; month?: number; day?: number; week?: number }) => {
  if (item.day && item.month) {
    const start = new Date(item.year, item.month - 1, item.day, 0, 0, 0, 0);
    const end = new Date(item.year, item.month - 1, item.day, 23, 59, 59, 999);
    return { start, end };
  }
  if (item.month) {
    const start = new Date(item.year, item.month - 1, 1, 0, 0, 0, 0);
    const end = new Date(item.year, item.month, 0, 23, 59, 59, 999);
    return { start, end };
  }
  if (item.week) {
    return isoWeekStartEnd(item.year, item.week);
  }
  const start = new Date(item.year, 0, 1, 0, 0, 0, 0);
  const end = new Date(item.year, 11, 31, 23, 59, 59, 999);
  return { start, end };
};

export const periodItemDate = (item: {
  year: number;
  month?: number;
  day?: number;
  week?: number;
}) => {
  const { start } = periodBounds(item);
  return toIsoDate(start);
};

export const filterPeriodRows = <T extends { year: number; month?: number; day?: number; week?: number }>(
  rows: T[],
  range: DateRange
) => {
  if (!range.from && !range.to) return rows;
  const fromTime = range.from ? new Date(`${range.from}T00:00:00`).getTime() : null;
  const toTime = range.to ? new Date(`${range.to}T23:59:59`).getTime() : null;
  return rows.filter((row) => {
    const { start, end } = periodBounds(row);
    if (fromTime && end.getTime() < fromTime) return false;
    if (toTime && start.getTime() > toTime) return false;
    return true;
  });
};

export const periodLabel = (item: {
  year: number;
  month?: number;
  day?: number;
  week?: number;
}, language: Language = 'en') => {
  if (item.day && item.month) {
    return formatDateByLanguage(new Date(item.year, item.month - 1, item.day), language, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  if (item.month) {
    return formatDateByLanguage(new Date(item.year, item.month - 1, 1), language, { month: 'short', year: 'numeric' });
  }
  if (item.week) {
    const weekLabel = language === 'en' ? 'week' : language === 'ps' ? 'اونۍ' : 'هفته';
    return `${formatReportNumber(item.week, language)} ${weekLabel} ${formatReportNumber(item.year, language)}`;
  }
  return formatReportNumber(item.year, language);
};

export const sumSalesTotals = (
  rows: { totalQuantity?: number; totalRevenue?: number; totalProfit?: number }[]
) => ({
  quantity: rows.reduce((a, r) => a + (r.totalQuantity || 0), 0),
  revenue: rows.reduce((a, r) => a + (r.totalRevenue || 0), 0),
  profit: rows.reduce((a, r) => a + (r.totalProfit || 0), 0),
});
