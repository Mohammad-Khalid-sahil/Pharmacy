const digitRanges = [
  { start: 0x06f0, end: 0x06f9 },
  { start: 0x0660, end: 0x0669 },
];

export const normalizeNumberString = (value: unknown) => {
  if (value === undefined || value === null) return '';

  return String(value)
    .trim()
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      const range = digitRanges.find((item) => code >= item.start && code <= item.end);
      return range ? String(code - range.start) : char;
    })
    .join('')
    .replace(/[\u066c,]/g, '')
    .replace(/\u066b/g, '.')
    .trim();
};

export const parseLocalizedNumber = (value: unknown, fallback = NaN) => {
  const normalized = normalizeNumberString(value);
  if (normalized === '') return fallback;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const isValidLocalizedNumber = (value: unknown, min?: number) => {
  const parsed = parseLocalizedNumber(value);
  return Number.isFinite(parsed) && (min === undefined || parsed >= min);
};

export const isValidLocalizedInteger = (value: unknown, min?: number) => {
  const normalized = normalizeNumberString(value);
  if (!/^[0-9]+$/.test(normalized)) return false;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && (min === undefined || parsed >= min);
};

export const inputNumberParser = (value: string | undefined) => parseLocalizedNumber(value, 0);
