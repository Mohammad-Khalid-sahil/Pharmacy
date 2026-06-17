import { ReactNode } from 'react';
import { useAppSelector } from '../../redux/hooks';
import { getCurrentUser } from '../../redux/services/authSlice';
import { Navigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';

const ProtectRoute = ({ children }: { children: ReactNode }) => {
  const user = useAppSelector(getCurrentUser);
  const { t } = useLanguage();

  if (!user) {
    return <Navigate to='/login' replace={true} />;
  }

  // Enforce single-admin-only access for all protected routes.
  // Only SUPER_ADMIN should access any protected route.
  if (user.role !== 'SUPER_ADMIN') {
    return <div className='panel'><h2>{t('accessDenied')}</h2></div>;
  }

  return children;
};

export default ProtectRoute;
