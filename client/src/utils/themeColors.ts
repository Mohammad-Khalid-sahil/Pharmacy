import { ThemeMode } from '../theme/ThemeContext';

/**
 * Comprehensive color palette that respects light/dark theme modes
 * All colors are chosen to be readable and consistent across both modes
 */
export const getThemeColors = (mode: ThemeMode) => {
  const isDark = mode === 'dark';

  return {
    // Primary colors
    primary: isDark ? '#14b8a6' : '#0f766e',
    primaryLight: isDark ? '#2dd4bf' : '#6fbdab',
    primaryDark: isDark ? '#0d9488' : '#084c45',

    // Secondary/Blue
    blue: isDark ? '#38bdf8' : '#2563eb',
    blueDark: isDark ? '#0ea5e9' : '#1d4ed8',
    blueLight: isDark ? '#7dd3fc' : '#93c5fd',

    // Status colors - adjusted for dark mode visibility
    success: isDark ? '#4ade80' : '#16a34a',
    successDark: isDark ? '#22c55e' : '#15803d',
    successLight: isDark ? '#86efac' : '#86efac',

    warning: isDark ? '#fbbf24' : '#f59e0b',
    warningDark: isDark ? '#f59e0b' : '#d97706',
    warningLight: isDark ? '#fcd34d' : '#fde047',

    danger: isDark ? '#f87171' : '#dc2626',
    dangerDark: isDark ? '#ef4444' : '#b91c1c',
    dangerLight: isDark ? '#fca5a5' : '#fecaca',

    // Neutral colors - for text and backgrounds
    text: isDark ? '#dce8ed' : '#172026',
    textStrong: isDark ? '#f2f8fa' : '#12343b',
    textMuted: isDark ? '#9fb0ba' : '#64748b',
    textInverse: isDark ? '#172026' : '#f2f8fa',

    // Surface colors
    surface: isDark ? '#101d23' : '#ffffff',
    surfaceElevated: isDark ? '#13272f' : '#f1f7f8',
    surfaceInset: isDark ? '#0d2027' : '#f5f9fb',

    // Border colors
    border: isDark ? '#29414a' : '#d9e5ea',
    borderLight: isDark ? '#1f343d' : '#e7eef2',
    borderInverted: isDark ? '#3a5a68' : '#cbd5e1',

    // Special colors for charts/components
    chart: {
      teal: isDark ? '#14b8a6' : '#0f766e',
      blue: isDark ? '#38bdf8' : '#2563eb',
      green: isDark ? '#4ade80' : '#16a34a',
      amber: isDark ? '#fbbf24' : '#f59e0b',
      red: isDark ? '#f87171' : '#dc2626',
      purple: isDark ? '#c084fc' : '#a855f7',
      cyan: isDark ? '#22d3ee' : '#06b6d4',
      indigo: isDark ? '#818cf8' : '#4f46e5',
    },

    // Invoice/receipt specific
    invoice: {
      bg: isDark ? '#0d2027' : '#ffffff',
      heading: isDark ? '#e5edf1' : '#12343b',
      text: isDark ? '#dce8ed' : '#172026',
      border: isDark ? '#29414a' : '#d9e5ea',
      lineEven: isDark ? '#142a32' : '#f9fafb',
      lineOdd: isDark ? '#0d2027' : '#ffffff',
    },

    // Modal/Dialog specific
    modal: {
      bg: isDark ? '#101d23' : '#ffffff',
      headerBg: isDark ? '#13272f' : '#f1f7f8',
      footerBg: isDark ? '#0d2027' : '#fafafa',
      border: isDark ? '#29414a' : '#d9e5ea',
      text: isDark ? '#dce8ed' : '#172026',
    },

    // POS/Cart specific
    pos: {
      cartBg: isDark ? '#0d2027' : '#f5f9fb',
      itemBg: isDark ? '#142a32' : '#ffffff',
      itemHover: isDark ? '#1a3a46' : '#f0fffe',
      border: isDark ? '#29414a' : '#d9e5ea',
      header: isDark ? '#13272f' : '#f1f7f8',
      total: isDark ? '#14b8a6' : '#0f766e',
      totalBg: isDark ? 'rgba(20, 184, 166, 0.1)' : 'rgba(15, 118, 110, 0.08)',
    },

    // Form specific
    form: {
      label: isDark ? '#d4e2e8' : '#314a54',
      placeholder: isDark ? '#7a8a94' : '#a5b5bf',
      inputBg: isDark ? '#0d2027' : '#ffffff',
      inputBorder: isDark ? '#29414a' : '#d9e5ea',
      inputBorderHover: isDark ? '#3a5a68' : '#b4d4de',
      inputBorderActive: isDark ? '#14b8a6' : '#0f766e',
      errorBg: isDark ? 'rgba(127, 29, 29, 0.18)' : '#fffafa',
      errorBorder: isDark ? '#f87171' : '#fca5a5',
      successBorder: isDark ? '#4ade80' : '#86efac',
    },

    // Table specific
    table: {
      headerBg: isDark ? '#13272f' : '#f1f7f8',
      headerText: isDark ? '#d4e2e8' : '#314a54',
      rowBg: isDark ? '#101d23' : '#ffffff',
      rowHover: isDark ? '#142a32' : '#eefbf9',
      rowEven: isDark ? '#0d2027' : '#f9fafb',
      border: isDark ? '#29414a' : '#d9e5ea',
      text: isDark ? '#dce8ed' : '#172026',
    },

    // Status badges
    badge: {
      success: isDark ? '#4ade80' : '#86efac',
      warning: isDark ? '#fbbf24' : '#fcd34d',
      error: isDark ? '#f87171' : '#fca5a5',
      info: isDark ? '#38bdf8' : '#93c5fd',
      default: isDark ? '#9fb0ba' : '#cbd5e1',
    },
  };
};

/**
 * Get chart colors as an array for multi-series charts
 */
export const getChartColorPalette = (mode: ThemeMode) => {
  const colors = getThemeColors(mode);
  return [
    colors.chart.teal,
    colors.chart.blue,
    colors.chart.amber,
    colors.chart.red,
    colors.chart.green,
    colors.chart.cyan,
    colors.chart.purple,
    colors.chart.indigo,
  ];
};
