import DashboardLegend from '../components/DashboardLegend';
import {
  AlertOutlined,
  BarChartOutlined,
  DollarOutlined,
  FileDoneOutlined,
  MedicineBoxOutlined,
  PlusCircleOutlined,
  SafetyCertificateOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { Button, Col, Flex, Row, Tag } from 'antd';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Loader from '../components/Loader';
import { useGetCashboxSummaryQuery, useGetSellerLedgersQuery } from '../redux/features/management/cashboxApi';
import { useGetCustomerDebtorAccountsQuery, useGetCustomerLedgersQuery } from '../redux/features/management/customerApi';
import { useGetAllExpensesQuery } from '../redux/features/management/expenseApi';
import {
  useCountProductsQuery,
  useGetAllProductsQuery,
  useGetExpiringAlertsQuery,
  useGetLowStockAlertsQuery,
} from '../redux/features/management/productApi';
import { useDailySaleQuery, useGetAllSaleQuery, useMonthlySaleQuery } from '../redux/features/management/saleApi';
import { useLanguage } from '../i18n/LanguageContext';
import { formatCurrencyByLanguage, formatDateByLanguage, formatNumberByLanguage } from '../utils/formatters';

const Dashboard = () => {
  const { t, language, dir } = useLanguage();
  const medicalColors = {
    teal: 'var(--color-primary)',
    mint: '#2dd4bf',
    blue: 'var(--color-blue)',
    sky: '#38bdf8',
    green: 'var(--color-success)',
    amber: 'var(--color-warning)',
    red: 'var(--color-danger)',
  };
  const chartGrid = 'var(--color-chart-grid)';
  const chartTick = 'var(--color-chart-tick)';
  const legendItems = {
    daily: [
      { label: t('revenueLabel'), color: medicalColors.teal },
      { label: t('quantityLabel'), color: medicalColors.blue },
    ],
    monthly: [
      { label: t('revenueLabel'), color: medicalColors.teal },
      { label: t('profitLabel'), color: medicalColors.blue },
    ],
    expense: [
      { label: t('expenseAmount'), color: medicalColors.amber },
    ],
    bestSelling: [
      { label: t('revenueLabel'), color: medicalColors.blue },
      { label: t('quantityLabel'), color: medicalColors.teal },
    ],
  };
  const navigate = useNavigate();
  const isRTL = dir === 'rtl';
  const chartMargin = { top: 18, right: isRTL ? 18 : 24, left: isRTL ? 24 : 18, bottom: 28 };
  const formatNumber = (value: number | undefined) =>
    formatNumberByLanguage(value, language);
  const money = (value: number | undefined) => formatCurrencyByLanguage(value, language);
  const truncateTick = (value: string, limit = 22) =>
    value && value.length > limit ? `${value.slice(0, limit - 1)}...` : value;
  const { data: products, isLoading } = useCountProductsQuery(undefined);
  const { data: allProducts } = useGetAllProductsQuery({ limit: 1000 });
  const { data: allSales } = useGetAllSaleQuery({ limit: 1000 });
  const { data: dailySales, isLoading: isDailyLoading } = useDailySaleQuery(undefined);
  const { data: monthlySales, isLoading: isMonthlyLoading } = useMonthlySaleQuery(undefined);
  const { data: cashbox } = useGetCashboxSummaryQuery(undefined);
  const { data: lowStock } = useGetLowStockAlertsQuery(undefined);
  const { data: expiring } = useGetExpiringAlertsQuery(30);
  const { data: expenses } = useGetAllExpensesQuery({ limit: 500 });
  const { data: customerLedgers } = useGetCustomerLedgersQuery({ limit: 500 });
  const { data: debtorAccounts } = useGetCustomerDebtorAccountsQuery({ status: 'active', limit: 1000 });
  const { data: sellerLedgers } = useGetSellerLedgersQuery({ limit: 500 });

  const nearExpiryCount = expiring?.data?.length || 0;

  const metrics = useMemo(() => {
    const today = new Date();
    const todayEntry = (dailySales?.data || []).find(
      (item: { day: number; month: number; year: number }) =>
        item.year === today.getFullYear() && item.month === today.getMonth() + 1 && item.day === today.getDate(),
    );
    const expiredProducts = (allProducts?.data || []).filter(
      (product: { expireDate?: string }) => product.expireDate && new Date(product.expireDate) < new Date(),
    );
    const ledgerDebt = (customerLedgers?.data || []).reduce((total: number, row: { type: string; amount: number }) => {
      if (row.type === 'DEBIT') return total + (row.amount || 0);
      if (row.type === 'CREDIT') return total - (row.amount || 0);
      return total;
    }, 0);
    const debtorDebt = (debtorAccounts?.data || []).reduce(
      (total: number, row: { currentDebt?: number }) => total + Number(row.currentDebt || 0),
      0,
    );
    const sellerPayable = (sellerLedgers?.data || []).reduce((total: number, row: { type: string; amount: number }) => {
      if (row.type === 'PURCHASE') return total + (row.amount || 0);
      if (row.type === 'PAYMENT') return total - (row.amount || 0);
      return total;
    }, 0);
    const cashboxData = cashbox?.data || {};

    return {
      todaySales: Number(cashboxData.todaySalesIncome ?? todayEntry?.totalRevenue ?? 0),
      todayProfit: Number(cashboxData.todayProfit ?? todayEntry?.totalProfit ?? 0),
      customerDebt: Math.max(Number(cashboxData.customerDebtTotal ?? debtorDebt + ledgerDebt), 0),
      sellerPayable: Math.max(Number(cashboxData.companyDebtTotal ?? sellerPayable), 0),
      expiredCount: expiredProducts.length,
      totalStock: products?.data?.totalQuantity || 0,
    };
  }, [allProducts, cashbox, customerLedgers, dailySales, debtorAccounts, products, sellerLedgers]);

  const dailyChartData = useMemo(
    () =>
      (dailySales?.data || []).slice(-12).map(
        (item: { day: number; month: number; year: number; totalRevenue: number; totalQuantity: number }) => ({
          name: formatDateByLanguage(new Date(item.year, item.month - 1, item.day), language, { month: 'short', day: 'numeric' }),
          sales: item.totalRevenue || 0,
          quantity: item.totalQuantity || 0,
        })
      ),
    [dailySales, language]
  );

  const monthlyChartData = useMemo(
    () =>
      (monthlySales?.data || []).slice(-12).map(
        (item: { month: number; year: number; totalRevenue: number; totalProfit?: number }) => ({
          name: formatDateByLanguage(new Date(item.year, item.month - 1, 1), language, { month: 'short', year: 'numeric' }),
          sales: item.totalRevenue || 0,
          profit: item.totalProfit || 0,
        })
      ),
    [monthlySales, language]
  );

  const expenseChartData = useMemo(() => {
    const map = new Map<string, number>();
    (expenses?.data || []).forEach((expense: { date?: string; amount?: number }) => {
      if (!expense.date) return;
      const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(expense.date)
        ? expense.date
        : (() => {
            const parsed = new Date(expense.date);
            if (Number.isNaN(parsed.getTime())) return '';
            return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
          })();
      if (!dateKey) return;
      const key = dateKey.slice(0, 7);
      map.set(key, (map.get(key) || 0) + (expense.amount || 0));
    });
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(-6);
  }, [expenses]);

  const topMedicineData = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number }>();
    (allSales?.data || []).forEach((sale: { productName?: string; quantity?: number; totalPrice?: number }) => {
      const key = sale.productName || t('unknown');
      const prev = map.get(key) || { name: key, quantity: 0, revenue: 0 };
      prev.quantity += sale.quantity || 0;
      prev.revenue += sale.totalPrice || 0;
      map.set(key, prev);
    });
    return [...map.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 8);
  }, [allSales, t]);

  const statCards = [
    { title: t('todaySales'), value: money(metrics.todaySales), icon: ShoppingCartOutlined, tone: 'teal' },
    { title: t('todayProfit'), value: money(metrics.todayProfit), icon: BarChartOutlined, tone: 'green' },
    { title: t('cashboxBalance'), value: money(cashbox?.data?.balance), icon: WalletOutlined, tone: 'blue' },
    { title: t('totalDebt'), value: money(metrics.customerDebt), icon: TeamOutlined, tone: 'amber' },
    { title: t('totalPayable'), value: money(metrics.sellerPayable), icon: DollarOutlined, tone: 'red' },
    { title: t('lowStockAlerts'), value: formatNumber(lowStock?.data?.length || 0), icon: AlertOutlined, tone: 'amber' },
    { title: t('expiringAlerts'), value: formatNumber(nearExpiryCount), icon: MedicineBoxOutlined, tone: 'blue' },
    { title: t('expiredMedicines'), value: formatNumber(metrics.expiredCount), icon: SafetyCertificateOutlined, tone: 'red' },
  ];

  const quickActions = [
    { label: t('newSale'), path: '/products', icon: ShoppingCartOutlined, tone: 'teal' },
    { label: t('newPurchase'), path: '/create-product', icon: MedicineBoxOutlined, tone: 'blue' },
    { label: t('customerPayment'), path: '/customers', icon: TeamOutlined, tone: 'green' },
    { label: t('paySeller'), path: '/purchases', icon: DollarOutlined, tone: 'red' },
    { label: t('addExpense'), path: '/expenses', icon: PlusCircleOutlined, tone: 'amber' },
    { label: t('backups'), path: '/backups', icon: FileDoneOutlined, tone: 'slate' },
  ];

  const alertItems = [
    { label: t('lowStockAlerts'), value: lowStock?.data?.length || 0, tone: 'warning' },
    { label: t('expiringAlerts'), value: nearExpiryCount, tone: 'info' },
    { label: t('expiredMedicines'), value: metrics.expiredCount, tone: 'error' },
    { label: t('highCustomerDebt'), value: money(metrics.customerDebt), tone: 'error' },
    { label: t('unpaidSellerBalances'), value: money(metrics.sellerPayable), tone: 'seller' },
  ];

  const getAlertTagColor = (tone: string) => {
    if (tone === 'error') return 'error';
    if (tone === 'info') return 'processing';
    if (tone === 'warning') return 'warning';
    return 'gold';
  };

  const formatChartValue = (value: unknown, name: unknown) => {
    const label = String(name);
    const numericValue = Number(value || 0);
    return [label === t('quantityLabel') ? formatNumber(numericValue) : money(numericValue), label];
  };

  if (isLoading || isDailyLoading || isMonthlyLoading) return <Loader />;

  return (
    <div className='dashboard-page'>
      <Flex className='dashboard-hero' justify='space-between' align='center' wrap='wrap' gap={16}>
        <div className='dashboard-hero__content'>
          <span>{t('appName')}</span>
          <h1>{t('dashboard')}</h1>
          <p>{t('dashboardSubtitle')}</p>
        </div>
        <div className='dashboard-hero__stock'>
          <small>{t('medicineStock')}</small>
          <strong>{formatNumber(metrics.totalStock)}</strong>
        </div>
      </Flex>

      <Row gutter={[16, 16]}>
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Col xs={24} sm={12} xl={6} key={card.title}>
              <div className={`dashboard-stat dashboard-stat--${card.tone}`}>
                <span className='dashboard-stat__icon'><Icon /></span>
                <div>
                  <p>{card.title}</p>
                  <strong>{card.value}</strong>
                </div>
              </div>
            </Col>
          );
        })}
      </Row>

      <Row gutter={[16, 16]} className='dashboard-section'>
        <Col xs={24}>
          <div className='dashboard-chart-card'>
            <h2>{t('dailySale')}</h2>
            <ResponsiveContainer width='100%' height={360}>
              <AreaChart data={dailyChartData} margin={chartMargin}>
                <defs>
                  <linearGradient id='dailySalesGradient' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='var(--color-primary)' stopOpacity={0.32} />
                    <stop offset='95%' stopColor='var(--color-primary)' stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id='dailyQuantityGradient' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='var(--color-blue)' stopOpacity={0.24} />
                    <stop offset='95%' stopColor='var(--color-blue)' stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray='3 3' stroke={chartGrid} />
                <XAxis dataKey='name' tickMargin={10} interval='preserveStartEnd' tick={{ fill: chartTick, fontSize: 12 }} />
                <YAxis yAxisId='money' width={104} tickFormatter={(value) => money(Number(value))} tick={{ fill: chartTick, fontSize: 11 }} tickMargin={8} />
                <YAxis yAxisId='count' orientation='right' width={62} tickFormatter={(value) => formatNumber(Number(value))} tick={{ fill: chartTick, fontSize: 11 }} tickMargin={8} />
                <Tooltip formatter={formatChartValue} />
                <Area yAxisId='money' type='monotone' dataKey='sales' name={t('revenueLabel')} stroke='var(--color-primary)' fill='url(#dailySalesGradient)' strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                <Area yAxisId='count' type='monotone' dataKey='quantity' name={t('quantityLabel')} stroke='var(--color-blue)' fill='url(#dailyQuantityGradient)' strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
            <DashboardLegend items={legendItems.daily} />
          </div>
        </Col>
        <Col xs={24} xl={12}>
          <div className='dashboard-chart-card'>
            <h2>{t('monthlyRevenue')}</h2>
            <ResponsiveContainer width='100%' height={300}>
              <BarChart data={monthlyChartData} margin={chartMargin}>
                <defs>
                  <linearGradient id='monthlySalesGradient' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='var(--color-primary)' stopOpacity={0.95} />
                    <stop offset='95%' stopColor='#14b8a6' stopOpacity={0.86} />
                  </linearGradient>
                  <linearGradient id='monthlyProfitGradient' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='var(--color-blue)' stopOpacity={0.95} />
                    <stop offset='95%' stopColor='#38bdf8' stopOpacity={0.86} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray='3 3' stroke={chartGrid} />
                <XAxis dataKey='name' tickMargin={10} interval='preserveStartEnd' tick={{ fill: chartTick, fontSize: 12 }} />
                <YAxis width={104} tickFormatter={(value) => money(Number(value))} tick={{ fill: chartTick, fontSize: 11 }} tickMargin={8} />
                <Tooltip formatter={formatChartValue} />
                <Bar dataKey='sales' name={t('revenueLabel')} fill='url(#monthlySalesGradient)' radius={[8, 8, 0, 0]} />
                <Bar dataKey='profit' name={t('profitLabel')} fill='url(#monthlyProfitGradient)' radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <DashboardLegend items={legendItems.monthly} />
          </div>
        </Col>
        <Col xs={24} xl={12}>
          <div className='dashboard-chart-card'>
            <h2>{t('reportExpenses')}</h2>
            <ResponsiveContainer width='100%' height={300}>
              <BarChart data={expenseChartData} margin={chartMargin}>
                <defs>
                  <linearGradient id='expenseGradient' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='var(--color-warning)' stopOpacity={0.96} />
                    <stop offset='95%' stopColor='#fbbf24' stopOpacity={0.82} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray='3 3' stroke={chartGrid} />
                <XAxis dataKey='name' tickMargin={10} interval='preserveStartEnd' tick={{ fill: chartTick, fontSize: 12 }} />
                <YAxis width={104} tickFormatter={(value) => money(Number(value))} tick={{ fill: chartTick, fontSize: 11 }} tickMargin={8} />
                <Tooltip formatter={(value, name) => [money(Number(value || 0)), String(name)]} />
                <Bar dataKey='value' name={t('expenseAmount')} fill='url(#expenseGradient)' radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <DashboardLegend items={legendItems.expense} />
          </div>
        </Col>
        <Col xs={24}>
          <div className='dashboard-chart-card'>
            <h2>{t('reportBestSelling')}</h2>
            <ResponsiveContainer width='100%' height={360}>
              <BarChart data={topMedicineData} layout='vertical' margin={{ top: 18, right: isRTL ? 18 : 28, left: isRTL ? 28 : 18, bottom: 24 }}>
                <defs>
                  <linearGradient id='topQuantityGradient' x1='0' y1='0' x2='1' y2='0'>
                    <stop offset='5%' stopColor='var(--color-primary)' stopOpacity={0.96} />
                    <stop offset='95%' stopColor='#2dd4bf' stopOpacity={0.84} />
                  </linearGradient>
                  <linearGradient id='topRevenueGradient' x1='0' y1='0' x2='1' y2='0'>
                    <stop offset='5%' stopColor='var(--color-blue)' stopOpacity={0.96} />
                    <stop offset='95%' stopColor='#60a5fa' stopOpacity={0.84} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray='3 3' stroke={chartGrid} />
                <XAxis xAxisId='revenue' type='number' tickFormatter={(value) => money(Number(value))} tick={{ fill: chartTick, fontSize: 11 }} tickMargin={8} />
                <XAxis xAxisId='quantity' type='number' hide />
                <YAxis type='category' dataKey='name' width={190} tickFormatter={(value) => truncateTick(String(value))} tickMargin={10} tick={{ fill: chartTick, fontSize: 12 }} />
                <Tooltip formatter={formatChartValue} />
                <Bar xAxisId='revenue' dataKey='revenue' name={t('revenueLabel')} fill='url(#topRevenueGradient)' radius={[0, 8, 8, 0]} />
                <Bar xAxisId='quantity' dataKey='quantity' name={t('quantityLabel')} fill='url(#topQuantityGradient)' radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <DashboardLegend items={legendItems.bestSelling} />
          </div>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className='dashboard-section'>
        <Col xs={24} xl={14}>
          <div className='dashboard-alerts'>
            <h2>{t('alerts')}</h2>
            {alertItems.map((item) => (
              <div className={`dashboard-alert dashboard-alert--${item.tone}`} key={item.label}>
                <span>{item.label}</span>
                <Tag color={getAlertTagColor(item.tone)}>
                  {typeof item.value === 'number' ? formatNumber(item.value) : item.value}
                </Tag>
              </div>
            ))}
          </div>
        </Col>
        <Col xs={24} xl={10}>
          <div className='dashboard-actions'>
            <h2>{t('quickActions')}</h2>
            <div>
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button className={`dashboard-action-btn dashboard-action-btn--${action.tone}`} key={action.label} onClick={() => navigate(action.path)}>
                    <Icon />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
