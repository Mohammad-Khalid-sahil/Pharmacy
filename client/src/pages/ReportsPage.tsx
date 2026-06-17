import { FileTextOutlined } from '@ant-design/icons';
import { Tabs } from 'antd';
import { useLanguage } from '../i18n/LanguageContext';
import SalesPeriodReport from '../components/reports/SalesPeriodReport';
import CustomerDebtReport from '../components/reports/CustomerDebtReport';
import SellerBalanceReport from '../components/reports/SellerBalanceReport';
import CashboxReport from '../components/reports/CashboxReport';
import ExpenseReport from '../components/reports/ExpenseReport';
import SalaryPaymentReport from '../components/reports/SalaryPaymentReport';
import LowStockReport from '../components/reports/LowStockReport';
import ExpiringReport from '../components/reports/ExpiringReport';
import ProductSalesReport from '../components/reports/ProductSalesReport';
import NetProfitReport from '../components/reports/NetProfitReport';
import InventoryReport from '../components/reports/InventoryReport';

const ReportsPage = () => {
  const { t } = useLanguage();

  const items = [
    { key: 'daily', label: t('reportDailySales'), children: <SalesPeriodReport period='daily' /> },
    { key: 'weekly', label: t('reportWeeklySales'), children: <SalesPeriodReport period='weekly' /> },
    { key: 'monthly', label: t('reportMonthlySales'), children: <SalesPeriodReport period='monthly' /> },
    { key: 'yearly', label: t('reportYearlySales'), children: <SalesPeriodReport period='yearly' /> },
    { key: 'customerDebt', label: t('reportCustomerDebt'), children: <CustomerDebtReport /> },
    { key: 'sellerBalance', label: t('reportSellerBalance'), children: <SellerBalanceReport /> },
    { key: 'cashbox', label: t('reportCashbox'), children: <CashboxReport /> },
    { key: 'expenses', label: t('reportExpenses'), children: <ExpenseReport /> },
    { key: 'salary', label: t('reportSalaryPayments'), children: <SalaryPaymentReport /> },
    { key: 'lowStock', label: t('reportLowStock'), children: <LowStockReport /> },
    { key: 'expiring', label: t('reportExpiring'), children: <ExpiringReport /> },
    { key: 'best', label: t('reportBestSelling'), children: <ProductSalesReport mode='best' /> },
    { key: 'slow', label: t('reportSlowSelling'), children: <ProductSalesReport mode='slow' /> },
    { key: 'netProfit', label: t('netProfit'), children: <NetProfitReport /> },
    { key: 'inventory', label: t('inventoryReport'), children: <InventoryReport /> },
  ];

  return (
    <div className='reports-page page-fade-in'>
      <div className='reports-page-header'>
        <div>
          <span>{t('reportsSubtitle')}</span>
          <h1>{t('reports')}</h1>
          <p>{t('reportsDescription')}</p>
        </div>
        <FileTextOutlined />
      </div>
      <Tabs items={items} tabPosition='top' className='reports-tabs' />
    </div>
  );
};

export default ReportsPage;
