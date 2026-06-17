import { RouterProvider } from 'react-router-dom';
import { router } from './routes/routes';
import { ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { ThemeProvider, useThemeMode } from './theme/ThemeContext';
import { getPharmacyTheme } from './theme/pharmacyTheme';

const AppShell = () => {
  const { dir, t } = useLanguage();
  const { mode } = useThemeMode();
  const locale = {
    ...enUS,
    Modal: {
      justOkText: enUS.Modal?.justOkText || 'OK',
      okText: t('submit'),
      cancelText: t('cancel'),
    },
    Popconfirm: {
      okText: t('submit'),
      cancelText: t('cancel'),
    },
  };

  return (
      <ConfigProvider
        direction={dir}
        theme={getPharmacyTheme(mode)}
        locale={locale}
      >
        <RouterProvider router={router} />
      </ConfigProvider>
  );
};

const App = () => (
  <LanguageProvider>
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  </LanguageProvider>
);

export default App;
