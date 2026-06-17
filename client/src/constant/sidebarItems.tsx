import {
  AimOutlined,
  AlertOutlined,
  BarChartOutlined,
  DashboardOutlined,
  DollarOutlined,
  FileProtectOutlined,
  HistoryOutlined,
  IdcardOutlined,
  CloudDownloadOutlined,
  MedicineBoxOutlined,
  ProductOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import React from 'react';
import { NavLink } from 'react-router-dom';
import { TUser } from '../redux/services/authSlice';
import { useLanguage } from '../i18n/LanguageContext';

export const useSidebarItems = (user: TUser | null) => {
  const { t } = useLanguage();
  const items = [
  {
    key: '/',
    label: <NavLink to='/'>{t('dashboard')}</NavLink>,
    icon: React.createElement(DashboardOutlined),
  },
  {
    key: '/create-product',
    label: <NavLink to='/create-product'>{t('addProduct')}</NavLink>,
    icon: React.createElement(MedicineBoxOutlined),
  },
  {
    key: '/products',
    label: <NavLink to='/products'>{t('products')}</NavLink>,
    icon: React.createElement(ProductOutlined),
  },
  {
    key: '/sales',
    label: <NavLink to='/sales'>{t('sales')}</NavLink>,
    icon: React.createElement(ShoppingCartOutlined),
  },
  {
    key: '/sellers',
    label: <NavLink to='/sellers'>{t('sellers')}</NavLink>,
    icon: React.createElement(ShopOutlined),
  },
  {
    key: '/purchases',
    label: <NavLink to='/purchases'>{t('purchases')}</NavLink>,
    icon: React.createElement(AimOutlined),
  },
  {
    key: '/expenses',
    label: <NavLink to='/expenses'>{t('expenses')}</NavLink>,
    icon: React.createElement(DollarOutlined),
  },
  {
    key: '/customers',
    label: <NavLink to='/customers'>{t('customers')}</NavLink>,
    icon: React.createElement(TeamOutlined),
  },
  {
    key: '/customer-debtors',
    label: <NavLink to='/customer-debtors'>{t('customerDebtors')}</NavLink>,
    icon: React.createElement(TeamOutlined),
  },
  {
    key: '/cashbox',
    label: <NavLink to='/cashbox'>{t('cashbox')}</NavLink>,
    icon: React.createElement(WalletOutlined),
  },
  {
    key: '/alerts',
    label: <NavLink to='/alerts'>{t('alerts')}</NavLink>,
    icon: React.createElement(AlertOutlined),
  },
  {
    key: '/prescriptions',
    label: <NavLink to='/prescriptions'>{t('prescriptions')}</NavLink>,
    icon: React.createElement(FileProtectOutlined),
  },
  {
    key: '/employees',
    label: <NavLink to='/employees'>{t('employees')}</NavLink>,
    icon: React.createElement(IdcardOutlined),
  },
  {
    key: '/reports',
    label: <NavLink to='/reports'>{t('reports')}</NavLink>,
    icon: React.createElement(BarChartOutlined),
  },
  {
    key: '/sales-history',
    label: <NavLink to='/sales-history'>{t('salesHistory')}</NavLink>,
    icon: React.createElement(HistoryOutlined),
  },
  {
    key: '/profile',
    label: <NavLink to='/profile'>{t('profile')}</NavLink>,
    icon: React.createElement(UserOutlined),
  },
  ];

  if (user?.role === 'SUPER_ADMIN') {
    items.splice(
      items.length - 1,
      0,
      {
        key: '/backups',
        label: <NavLink to='/backups'>{t('backups')}</NavLink>,
        icon: React.createElement(CloudDownloadOutlined),
      }
    );
  }

  return items;
};
