import { theme, type ThemeConfig } from 'antd';
import { ThemeMode } from './ThemeContext';

const sharedComponents: NonNullable<ThemeConfig['components']> = {
  Alert: {
    borderRadiusLG: 8,
    withDescriptionIconSize: 22,
  },
  Button: {
    borderRadius: 8,
    controlHeight: 38,
    fontWeight: 700,
  },
  Input: {
    activeBorderColor: '#0f766e',
    hoverBorderColor: '#14b8a6',
    controlHeight: 38,
    borderRadius: 8,
  },
  InputNumber: {
    activeBorderColor: '#0f766e',
    hoverBorderColor: '#14b8a6',
    controlHeight: 38,
    borderRadius: 8,
  },
  Pagination: {
    itemActiveBg: '#0f766e',
    borderRadiusSM: 6,
    borderRadiusLG: 8,
  },
  Select: {
    activeBorderColor: '#0f766e',
    hoverBorderColor: '#14b8a6',
    controlHeight: 38,
    borderRadius: 8,
  },
  Tag: {
    borderRadiusSM: 6,
  },
  Drawer: {
    borderRadiusLG: 10,
  },
  Popover: {
    borderRadiusLG: 8,
  },
  Tooltip: {
    borderRadiusLG: 6,
  },
};

export const getPharmacyTheme = (mode: ThemeMode): ThemeConfig => {
  const isDark = mode === 'dark';

  return {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: '#0f766e',
      colorInfo: '#0891b2',
      colorSuccess: '#16a34a',
      colorWarning: '#f59e0b',
      colorError: '#dc2626',
      colorText: isDark ? '#e5edf1' : '#172026',
      colorTextSecondary: isDark ? '#9fb0ba' : '#5f6f7a',
      colorBgBase: isDark ? '#071216' : '#f5f9fb',
      colorBgContainer: isDark ? '#101d23' : '#ffffff',
      colorBorder: isDark ? '#29414a' : '#d9e5ea',
      colorBorderSecondary: isDark ? '#1f343d' : '#e7eef2',
      borderRadius: 8,
      borderRadiusLG: 10,
      borderRadiusSM: 6,
      boxShadow: isDark ? '0 18px 44px rgba(0, 0, 0, 0.34)' : '0 14px 35px rgba(28, 55, 66, 0.08)',
      boxShadowSecondary: isDark ? '0 10px 26px rgba(0, 0, 0, 0.28)' : '0 8px 22px rgba(28, 55, 66, 0.06)',
      controlHeight: 38,
      controlHeightLG: 44,
      controlHeightSM: 30,
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    components: {
      ...sharedComponents,
      Button: {
        ...(sharedComponents.Button ?? {}),
        primaryShadow: isDark ? '0 10px 22px rgba(45, 212, 191, 0.18)' : '0 10px 20px rgba(15, 118, 110, 0.18)',
      },
      Card: {
        borderRadiusLG: 8,
        boxShadowTertiary: isDark ? '0 18px 44px rgba(0, 0, 0, 0.32)' : '0 14px 35px rgba(28, 55, 66, 0.08)',
        headerBg: isDark ? '#101d23' : '#ffffff',
      },
      Descriptions: {
        labelBg: isDark ? '#13272f' : '#f1f7f8',
      },
      Form: {
        itemMarginBottom: 16,
        labelColor: isDark ? '#d4e2e8' : '#314a54',
      },
      Layout: {
        bodyBg: isDark ? '#071216' : '#f5f9fb',
        siderBg: isDark ? '#08191e' : '#12343b',
        triggerBg: isDark ? '#061317' : '#0f2f35',
      },
      Menu: {
        darkItemBg: isDark ? '#08191e' : '#12343b',
        darkItemSelectedBg: '#0f766e',
        darkItemHoverBg: isDark ? '#102c33' : '#174851',
        darkSubMenuItemBg: isDark ? '#061317' : '#0f2f35',
        itemBorderRadius: 8,
      },
      Modal: {
        borderRadiusLG: 10,
        contentBg: isDark ? '#101d23' : '#ffffff',
        headerBg: isDark ? '#101d23' : '#ffffff',
        titleColor: isDark ? '#e5edf1' : '#12343b',
      },
      Table: {
        borderColor: isDark ? '#29414a' : '#d9e5ea',
        headerBg: isDark ? '#13272f' : '#f1f7f8',
        headerColor: isDark ? '#d4e2e8' : '#314a54',
        rowHoverBg: isDark ? '#142a32' : '#eefbf9',
      },
      Checkbox: {
        borderRadiusSM: 4,
        colorBorder: isDark ? '#29414a' : '#d9e5ea',
      },
      Radio: {
        borderRadiusSM: 4,
        colorBorder: isDark ? '#29414a' : '#d9e5ea',
      },
      Segmented: {
        borderRadius: 8,
        itemSelectedBg: isDark ? '#0f766e' : '#0f766e',
      },
      Steps: {
        colorPrimary: '#0f766e',
        colorTextDescription: isDark ? '#9fb0ba' : '#5f6f7a',
      },
      Tooltip: {
        borderRadius: 6,
        colorBgSpotlight: isDark ? '#1a2a30' : '#f5f5f5',
        colorTextLightSolid: isDark ? '#e5edf1' : '#172026',
      },
      Popover: {
        borderRadius: 8,
        colorBgElevated: isDark ? '#101d23' : '#ffffff',
        boxShadowSecondary: isDark ? '0 10px 26px rgba(0, 0, 0, 0.28)' : '0 8px 22px rgba(28, 55, 66, 0.06)',
      },
      Empty: {
        colorTextDescription: isDark ? '#9fb0ba' : '#5f6f7a',
      },
    },
  };
};

export const pharmacyTheme = getPharmacyTheme('light');
