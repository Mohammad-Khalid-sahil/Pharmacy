import { createHashRouter } from 'react-router-dom';
import ProtectRoute from '../components/layout/ProtectRoute';
import Sidebar from '../components/layout/Sidebar';
import CreateProduct from '../pages/CreateProduct';
import { Suspense, lazy } from 'react';
import Loader from '../components/Loader';

const Dashboard = lazy(() => import('../pages/Dashboard'));
const BackupManagementPage = lazy(() => import('../pages/BackupManagementPage'));
const ReportsPage = lazy(() => import('../pages/ReportsPage'));
const SaleHistoryPage = lazy(() => import('../pages/SaleHistoryPage'));
import NotFound from '../pages/NotFound';
import ProfilePage from '../pages/ProfilePage';
// SaleHistoryPage is lazy-loaded above
import LoginPage from '../pages/auth/LoginPage';
import ProductManagePage from '../pages/managements/ProductManagePage';
import PurchaseManagementPage from '../pages/managements/PurchaseManagementPage';
import SaleManagementPage from '../pages/managements/SaleManagementPage';
import SellerManagementPage from '../pages/managements/SellerManagementPage';
import ChangePasswordPage from '../pages/ChangePasswordPage';
import EditProfilePage from '../pages/EditProfilePage';
import ExpenseManagementPage from '../pages/ExpenseManagementPage';
import CustomerManagementPage from '../pages/CustomerManagementPage';
import CustomerDebtorsPage from '../pages/CustomerDebtorsPage';
import CashboxPage from '../pages/CashboxPage';
import AlertsPage from '../pages/AlertsPage';
import PrescriptionManagementPage from '../pages/PrescriptionManagementPage';
import EmployeeManagementPage from '../pages/EmployeeManagementPage';
// BackupManagementPage and ReportsPage are lazy-loaded above

export const router = createHashRouter([
  {
    path: '/',
    element: <Sidebar />,
    children: [
      {
        path: '/',
        element: (
          <ProtectRoute>
              <Suspense fallback={<Loader />}>
                <Dashboard />
              </Suspense>
          </ProtectRoute>
        ),
      },
      {
        path: 'create-product',
        element: (
          <ProtectRoute>
            <CreateProduct />
          </ProtectRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <ProtectRoute>
            <ProfilePage />
          </ProtectRoute>
        ),
      },
      {
        path: 'products',
        element: (
          <ProtectRoute>
            <ProductManagePage />
          </ProtectRoute>
        ),
      },
      {
        path: 'sales',
        element: (
          <ProtectRoute>
            <SaleManagementPage />
          </ProtectRoute>
        ),
      },
      {
        path: 'sellers',
        element: (
          <ProtectRoute>
            <SellerManagementPage />
          </ProtectRoute>
        ),
      },
      {
        path: 'purchases',
        element: (
          <ProtectRoute>
            <PurchaseManagementPage />
          </ProtectRoute>
        ),
      },
      {
        path: 'expenses',
        element: (
          <ProtectRoute>
            <ExpenseManagementPage />
          </ProtectRoute>
        ),
      },
      {
        path: 'customers',
        element: (
          <ProtectRoute>
            <CustomerManagementPage />
          </ProtectRoute>
        ),
      },
      {
        path: 'customer-debtors',
        element: (
          <ProtectRoute>
            <CustomerDebtorsPage />
          </ProtectRoute>
        ),
      },
      {
        path: 'cashbox',
        element: (
          <ProtectRoute>
            <CashboxPage />
          </ProtectRoute>
        ),
      },
      {
        path: 'alerts',
        element: (
          <ProtectRoute>
            <AlertsPage />
          </ProtectRoute>
        ),
      },
      {
        path: 'prescriptions',
        element: (
          <ProtectRoute>
            <PrescriptionManagementPage />
          </ProtectRoute>
        ),
      },
      {
        path: 'employees',
        element: (
          <ProtectRoute>
            <EmployeeManagementPage />
          </ProtectRoute>
        ),
      },
      {
        path: 'backups',
        element: (
          <ProtectRoute>
              <Suspense fallback={<Loader />}>
                <BackupManagementPage />
              </Suspense>
          </ProtectRoute>
        ),
      },
      {
        path: 'reports',
        element: (
          <ProtectRoute>
              <Suspense fallback={<Loader />}>
                <ReportsPage />
              </Suspense>
          </ProtectRoute>
        ),
      },
      {
        path: 'sales-history',
        element: (
          <ProtectRoute>
              <Suspense fallback={<Loader />}>
                <SaleHistoryPage />
              </Suspense>
          </ProtectRoute>
        ),
      },
      {
        path: 'edit-profile',
        element: (
          <ProtectRoute>
            <EditProfilePage />
          </ProtectRoute>
        ),
      },
      {
        path: 'change-password',
        element: (
          <ProtectRoute>
            <ChangePasswordPage />
          </ProtectRoute>
        ),
      },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '*', element: <NotFound /> },
]);
