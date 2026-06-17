import { BarChartOutlined, PrinterOutlined } from '@ant-design/icons';
import { Button, Col, Flex, Row, Statistic } from 'antd';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import DashboardLegend from '../components/DashboardLegend';
import HistoryTable from '../components/tables/HistoryTable';
import { useLanguage } from '../i18n/LanguageContext';
import {
  useDailySaleQuery,
  useMonthlySaleQuery,
  useWeeklySaleQuery,
  useYearlySaleQuery,
} from '../redux/features/management/saleApi';
import {
  formatReportMoney,
  formatReportNumber,
  periodLabel,
  sumSalesTotals,
} from '../utils/reportHelpers';

type SaleHistoryRow = {
  _id: string;
  day?: number;
  month?: number;
  week?: number;
  year: number;
  totalQuantity?: number;
  totalRevenue?: number;
  totalProfit?: number;
};

const chartColors = {
  revenue: '#0f766e',
  quantity: '#0891b2',
  profit: '#2563eb',
};

const SaleHistoryPage = () => {
  const { t, language } = useLanguage();
  const { data: yearlyData, isFetching: isYearlyDataFetching } = useYearlySaleQuery(undefined);
  const { data: monthlyData, isFetching: isMonthlyDataFetching } = useMonthlySaleQuery(undefined);
  const { data: dailySale, isFetching: isDailySaleFetching } = useDailySaleQuery(undefined);
  const { data: weeklySale, isFetching: isWeeklySaleFetching } = useWeeklySaleQuery(undefined);

  const sections = [
    { key: 'yearly', title: t('yearlySale'), data: yearlyData, loading: isYearlyDataFetching },
    { key: 'monthly', title: t('monthlySale'), data: monthlyData, loading: isMonthlyDataFetching },
    { key: 'weekly', title: t('weeklySale'), data: weeklySale, loading: isWeeklySaleFetching },
    { key: 'daily', title: t('dailySaleTitle'), data: dailySale, loading: isDailySaleFetching },
  ];

  const allRows = useMemo(
    () =>
      sections.flatMap((section) => ((section.data?.data || []) as SaleHistoryRow[])),
    [dailySale, monthlyData, weeklySale, yearlyData],
  );
  const totals = useMemo(() => sumSalesTotals(allRows), [allRows]);
  const heroChartData = sections.map((section) => {
    const sectionTotals = sumSalesTotals((section.data?.data || []) as SaleHistoryRow[]);
    return {
      name: section.title,
      revenue: sectionTotals.revenue,
      quantity: sectionTotals.quantity,
    };
  });

  const legendItems = [
    { label: t('totalRevenue'), color: chartColors.revenue },
    { label: t('quantity'), color: chartColors.quantity },
  ];

  const handlePrint = () => window.print();

  return (
    <div className='sales-history-page secondary-page page-fade-in report-print-area'>
      <Flex className='secondary-page-header sales-history-header no-print' justify='space-between' align='center' wrap='wrap' gap={16}>
        <div>
          <span>{t('salesHistory')}</span>
          <h1>{t('salesHistory')}</h1>
          <p>{t('reportsDescription')}</p>
        </div>
        <BarChartOutlined />
      </Flex>

      <Flex className='secondary-toolbar no-print' justify='space-between' align='center' wrap='wrap' gap={12}>
        <div>
          <h2>{t('salesHistory')}</h2>
          <p>{t('dailySale')} / {t('monthlySale')}</p>
        </div>
        <Button type='primary' className='btn-role-print' icon={<PrinterOutlined />} onClick={handlePrint}>
          {t('print')}
        </Button>
      </Flex>

      <Row gutter={[14, 14]} className='secondary-summary-row'>
        <Col xs={24} md={8}>
          <div className='secondary-summary-card is-info'>
            <Statistic title={t('totalQuantity')} value={formatReportNumber(totals.quantity, language)} />
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className='secondary-summary-card is-success'>
            <Statistic title={t('totalRevenue')} value={formatReportMoney(totals.revenue, language)} />
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className='secondary-summary-card is-total'>
            <Statistic title={t('records')} value={formatReportNumber(allRows.length, language)} />
          </div>
        </Col>
      </Row>

      <div className='sales-history-chart secondary-table-card'>
        <Flex className='secondary-page-table-toolbar' justify='space-between' align='center' wrap='wrap' gap={12}>
          <h2>{t('totalRevenue')}</h2>
        </Flex>
        <ResponsiveContainer width='100%' height={300}>
          <BarChart data={heroChartData} margin={{ top: 18, right: 24, left: 18, bottom: 28 }}>
            <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='rgba(148, 163, 184, 0.35)' />
            <XAxis dataKey='name' tickMargin={10} tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis yAxisId='money' width={104} tickFormatter={(value) => formatReportMoney(Number(value), language)} tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis yAxisId='count' orientation='right' width={62} tickFormatter={(value) => formatReportNumber(Number(value), language)} tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip formatter={(value: number, name: string) => [name === 'quantity' ? formatReportNumber(value, language) : formatReportMoney(value, language), name === 'quantity' ? t('quantity') : t('totalRevenue')]} />
            <Bar yAxisId='money' dataKey='revenue' name={t('totalRevenue')} fill={chartColors.revenue} radius={[8, 8, 0, 0]} />
            <Bar yAxisId='count' dataKey='quantity' name={t('quantity')} fill={chartColors.quantity} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <DashboardLegend items={legendItems} />
      </div>

      <Row gutter={[16, 16]} className='sales-history-grid'>
        {sections.map((section) => {
          const rows = (section.data?.data || []) as SaleHistoryRow[];
          const preview = rows.slice(-8).map((row) => ({
            name: periodLabel(row, language),
            revenue: row.totalRevenue || 0,
          }));
          return (
            <Col xs={24} xl={12} key={section.key}>
              <div className='sales-history-card secondary-table-card'>
                <Flex className='secondary-page-table-toolbar' justify='space-between' align='center' wrap='wrap' gap={12}>
                  <h2>{section.title}</h2>
                </Flex>
                <ResponsiveContainer width='100%' height={180}>
                  <BarChart data={preview} margin={{ top: 12, right: 12, left: 8, bottom: 12 }}>
                    <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='rgba(148, 163, 184, 0.28)' />
                    <XAxis dataKey='name' hide />
                    <YAxis hide />
                    <Tooltip formatter={(value: number) => formatReportMoney(value, language)} />
                    <Bar dataKey='revenue' name={t('totalRevenue')} fill={chartColors.revenue} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <HistoryTable data={section.data} isFetching={section.loading} />
              </div>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default SaleHistoryPage;
