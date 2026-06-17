import { SpinnerIcon } from '@phosphor-icons/react';
import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { Button, Flex, Tooltip } from 'antd';
import { useEffect, useState } from 'react';
import { FieldValues, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import toastMessage from '../../lib/toastMessage';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { DEFAULT_LOCAL_USER, getCurrentUser, loginUser, TUser } from '../../redux/services/authSlice';
import { useLanguage } from '../../i18n/LanguageContext';
import PharmacyLogo from '../../components/branding/PharmacyLogo';
import { useThemeMode } from '../../theme/ThemeContext';

const languageLabels = {
  fa: 'دری',
  ps: 'پښتو',
  en: 'English',
} as const;

const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const currentUser = useAppSelector(getCurrentUser);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t, language, setLanguage, dir } = useLanguage();
  const { mode, toggleMode } = useThemeMode();
  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: DEFAULT_LOCAL_USER.email,
      password: DEFAULT_LOCAL_USER.password,
    },
  });

  useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  const onSubmit = async (data: FieldValues) => {
    if (!window.auth?.login) {
      toastMessage({ icon: 'error', text: 'Static login is not available. Open the app through Electron.' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await window.auth.login({ email: String(data.email), password: String(data.password) });

      if (res.success && res.token === 'local-admin-session-token' && res.user) {
        const user = res.user as TUser;
        localStorage.setItem('token', 'local-admin-session-token');
        localStorage.setItem('user', JSON.stringify(user));
        dispatch(loginUser({ token: 'local-admin-session-token', user }));
        navigate('/', { replace: true });
        toastMessage({ icon: 'success', text: t('loginSuccess') });
        return;
      }
      toastMessage({ icon: 'error', text: res.message || t('invalidCredentials') });
    } catch (error: any) {
      toastMessage({ icon: 'error', text: error?.message || t('invalidCredentials') });
    } finally {
      setIsLoading(false);
    }
  };

  // if (isLoading) <Loader />;
  // else
  return (
    <Flex justify='center' align='center' style={{ height: '100vh' }} dir={dir} className='auth-page'>
      <div className='auth-bg-mark auth-bg-mark--cross' aria-hidden='true' />
      <div className='auth-bg-mark auth-bg-mark--capsule' aria-hidden='true' />
      <Flex vertical className='auth-card'>
        <div className='auth-brand'>
          <PharmacyLogo size={58} />
          <strong>{t('appName')}</strong>
        </div>
        <div className='auth-heading'>
          <h1>{t('login')}</h1>
          <p>{t('loginSubtitle')}</p>
        </div>
        <div className='language-switcher auth-language'>
          {(['fa', 'ps', 'en'] as const).map((item) => (
            <button className={language === item ? 'active' : ''} onClick={() => setLanguage(item)} key={item} type='button'>
              {languageLabels[item]}
            </button>
          ))}
        </div>
        <Tooltip title={mode === 'dark' ? t('lightMode') : t('darkMode')}>
          <Button
            className='auth-theme-toggle theme-toggle-button'
            onClick={toggleMode}
            icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
          >
            {mode === 'dark' ? t('lightMode') : t('darkMode')}
          </Button>
        </Tooltip>
        <form onSubmit={handleSubmit(onSubmit)} className='auth-form'>
          <label className='auth-input-label' htmlFor='login-email'>
            {t('email')}
          </label>
          <input
            id='login-email'
            type='text'
            {...register('email', { required: true })}
            placeholder={t('email')}
            className={`input-field auth-input ${errors['email'] ? 'input-field-error' : ''}`}
          />
          {errors['email'] && (
            <span className='auth-error-text'>{t('emailRequired')}</span>
          )}

          <label className='auth-input-label' htmlFor='login-password'>
            {t('password')}
          </label>
          <input
            id='login-password'
            type='password'
            placeholder={t('password')}
            className={`input-field auth-input ${errors['password'] ? 'input-field-error' : ''}`}
            {...register('password', { required: true })}
          />
          {errors['password'] && (
            <span className='auth-error-text'>{t('passwordRequired')}</span>
          )}

          <Flex justify='center'>
            <Button
              htmlType='submit'
              type='primary'
              disabled={isLoading}
              className='auth-submit'
            >
              {isLoading && <SpinnerIcon className='spin' weight='bold' />}
              {t('login')}
            </Button>
          </Flex>
        </form>
      </Flex>
    </Flex>
  );
};

export default LoginPage;
