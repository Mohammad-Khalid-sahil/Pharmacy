import { SalaryDayOfWeek } from '../types/salaryPayment.types';

const DAY_KEYS: Record<SalaryDayOfWeek, string> = {
  SATURDAY: 'daySaturday',
  SUNDAY: 'daySunday',
  MONDAY: 'dayMonday',
  TUESDAY: 'dayTuesday',
  WEDNESDAY: 'dayWednesday',
  THURSDAY: 'dayThursday',
  FRIDAY: 'dayFriday',
};

export const getDayOfWeekFromDate = (dateValue?: string): SalaryDayOfWeek | '' => {
  if (!dateValue) return '';
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
    ? new Date(`${dateValue}T12:00:00`)
    : new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return '';
  const map: Record<number, SalaryDayOfWeek> = {
    6: 'SATURDAY',
    0: 'SUNDAY',
    1: 'MONDAY',
    2: 'TUESDAY',
    3: 'WEDNESDAY',
    4: 'THURSDAY',
    5: 'FRIDAY',
  };
  return map[parsed.getDay()] || '';
};

export const getDayOfWeekLabel = (
  dayOfWeek: string | undefined,
  t: (key: string) => string,
  dateValue?: string,
): string => {
  const key = (dayOfWeek || getDayOfWeekFromDate(dateValue)) as SalaryDayOfWeek;
  if (!key || !DAY_KEYS[key]) return '-';
  return t(DAY_KEYS[key]);
};
