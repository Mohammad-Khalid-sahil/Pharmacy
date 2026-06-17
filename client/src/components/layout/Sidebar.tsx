import { LogoutOutlined, MinusOutlined, MoonOutlined, PlusOutlined, RedoOutlined, SunOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Layout, Menu, Tooltip } from 'antd';
import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSidebarItems } from '../../constant/sidebarItems';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { getCurrentUser, logoutUser } from '../../redux/services/authSlice';
import { useThemeMode } from '../../theme/ThemeContext';
import userProPic from '../../assets/User.png';
import PharmacyLogo from '../branding/PharmacyLogo';
import { getPersistedProfileUser } from '../../utils/profileStorage';

const { Content, Sider } = Layout;

const languageLabels = {
  fa: 'دری',
  ps: 'پښتو',
  en: 'English',
} as const;

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [zoomFactor, setZoomFactor] = useState(() => Number(localStorage.getItem('pharmacy.zoomFactor') || 1));
  const [isMobileSidebar, setIsMobileSidebar] = useState(false);
  const dispatch = useAppDispatch();
  const user = useAppSelector(getCurrentUser);
  const items = useSidebarItems(user);
  const { language, setLanguage, t, dir } = useLanguage();
  const { mode, toggleMode } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();
  const selectedKey = location.pathname === '/' ? '/' : `/${location.pathname.split('/')[1]}`;
  const savedProfile = getPersistedProfileUser();
  const profileAvatar = user?.avatar || savedProfile?.avatar || userProPic;

  const handleClick = () => {
    dispatch(logoutUser());
    navigate('/');
  };

  const setZoom = async (factor: number) => {
    const next = await window.pharmacyZoom?.set(factor);
    const persisted = Number(next || factor || 1);
    localStorage.setItem('pharmacy.zoomFactor', String(persisted));
    setZoomFactor(persisted);
  };

  useEffect(() => {
    window.pharmacyZoom?.set(zoomFactor);
  }, []);

  return (
    <Layout className='app-shell' dir={dir}>
      <Sider
        breakpoint='lg'
        collapsed={collapsed}
        collapsedWidth={isMobileSidebar ? 0 : 76}
        collapsible
        onBreakpoint={(broken) => {
          setIsMobileSidebar(broken);
          setCollapsed(broken);
        }}
        onCollapse={setCollapsed}
        width={264}
        className='app-sidebar'
      >
        <div className='sidebar-brand'>
          <PharmacyLogo size={46} showText title={t('appName')} tone='light' />
          <div className='language-switcher'>
            {(['fa', 'ps', 'en'] as const).map((item) => (
              <button className={language === item ? 'active' : ''} onClick={() => setLanguage(item)} key={item} type='button'>
                {languageLabels[item]}
              </button>
            ))}
          </div>
          <Tooltip title={mode === 'dark' ? t('lightMode') : t('darkMode')} placement={dir === 'rtl' ? 'left' : 'right'}>
            <Button
              className='theme-toggle-button'
              onClick={toggleMode}
              icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
              block
            >
              <span className='theme-toggle-button__text'>{mode === 'dark' ? t('lightMode') : t('darkMode')}</span>
            </Button>
          </Tooltip>
          <div className='language-switcher'>
            <Tooltip title='Zoom out'>
              <button type='button' onClick={() => setZoom(zoomFactor - 0.1)}><MinusOutlined /></button>
            </Tooltip>
            <Tooltip title='Reset zoom'>
              <button type='button' onClick={() => setZoom(1)}><RedoOutlined /></button>
            </Tooltip>
            <Tooltip title='Zoom in'>
              <button type='button' onClick={() => setZoom(zoomFactor + 0.1)}><PlusOutlined /></button>
            </Tooltip>
          </div>
        </div>

        <div className='sidebar-profile'>
          <Avatar size={42} src={profileAvatar} icon={<UserOutlined />} className='sidebar-profile__avatar' />
          <div className='sidebar-profile__meta'>
            <strong>{user?.name || t('admin')}</strong>
            <span>{user?.role || user?.email || '-'}</span>
          </div>
        </div>

        <Menu
          theme='dark'
          mode='inline'
          className='sidebar-menu'
          selectedKeys={[selectedKey]}
          items={items}
        />

        <div className='sidebar-footer'>
          <Button className='logout-button' onClick={handleClick} icon={<LogoutOutlined />} block>
            <span className='logout-button__text'>{t('logout')}</span>
          </Button>
        </div>
      </Sider>

      <Layout className='app-main-layout'>
        <Content className='app-content'>
          <div className='app-page-container'>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default Sidebar;
