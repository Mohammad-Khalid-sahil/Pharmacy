import { Table } from 'antd';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  // Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import DashboardLegend from '../DashboardLegend';
import {
  useDailySaleQuery,
  useMonthlySaleQuery,
  useWeeklySaleQuery,
  useYearlySaleQuery,
} from '../../redux/features/management/saleApi';
import { useLanguage } from '../../i18n/LanguageContext';
import ReportSection from './ReportSection';
import {
  DateRange,
  filterPeriodRows,
  formatReportMoney,
  formatReportNumber,
  periodLabel,
  sumSalesTotals,
} from '../../utils/reportHelpers';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';
type SalesPeriodRow = {
  year: number;
  month?: number;
  day?: number;
  week?: number;
  totalQuantity?: number;
  totalRevenue?: number;
  totalProfit?: number;
};

const SalesPeriodReport = ({ period }: { period: Period }) => {
  const { t, language } = useLanguage();
  // Legend items for each chart
  const legendItems = [
    { label: t('totalRevenue'), color: '#0f766e' },
    { label: t('quantity'), color: '#0891b2' },
    ...(period !== 'daily' ? [{ label: t('totalProfit'), color: '#2563eb' }] : []),
  ];
  const [range, setRange] = useState<DateRange>({});
  const daily = useDailySaleQuery(undefined, { skip: period !== 'daily' });
  const weekly = useWeeklySaleQuery(undefined, { skip: period !== 'weekly' });
  const monthly = useMonthlySaleQuery(undefined, { skip: period !== 'monthly' });
  const yearly = useYearlySaleQuery(undefined, { skip: period !== 'yearly' });

  const active =
    period === 'daily' ? daily : period === 'weekly' ? weekly : period === 'monthly' ? monthly : yearly;

  const titleMap = {
    daily: t('reportDailySales'),
    weekly: t('reportWeeklySales'),
    monthly: t('reportMonthlySales'),
    yearly: t('reportYearlySales'),
  };

  const rows = useMemo(() => {
    const raw = (active.data?.data || []) as SalesPeriodRow[];
    return filterPeriodRows(raw, range);
  }, [active.data, range]);

  const totals = useMemo(() => sumSalesTotals(rows), [rows]);

  const chartData = useMemo(
    () =>
      rows.map((item) => ({
        name: periodLabel(item, language),
        quantity: item.totalQuantity || 0,
        revenue: item.totalRevenue || 0,
        profit: item.totalProfit || 0,
      })),
    [language, rows]
  );

  const columns = [
    { title: t('period'), key: 'period', render: (_: unknown, row: { year: number; month?: number; day?: number; week?: number }) => periodLabel(row, language) },
    { title: t('quantity'), dataIndex: 'totalQuantity', key: 'totalQuantity', align: 'center' as const, render: (v: number) => formatReportNumber(v, language) },
    { title: t('totalRevenue'), dataIndex: 'totalRevenue', key: 'totalRevenue', align: 'center' as const, render: (v: number) => formatReportMoney(v, language) },
    ...(period !== 'daily'
      ? [{ title: t('totalProfit'), dataIndex: 'totalProfit', key: 'totalProfit', align: 'center' as const, render: (v: number) => v != null ? formatReportMoney(v, language) : '-' }]
      : []),
  ];

  return (
    <ReportSection
      title={titleMap[period]}
      loading={active.isFetching}
      range={range}
      onRangeChange={setRange}
      isEmpty={!active.isFetching && rows.length === 0}
      summary={[
        { label: t('totalQuantity'), value: totals.quantity, type: 'number' },
        { label: t('totalRevenue'), value: totals.revenue, type: 'money' },
        { label: t('totalProfit'), value: totals.profit, type: 'money' },
      ]}
    >
      <ResponsiveContainer width='100%' height={320}>
        <BarChart data={chartData} margin={{ top: 18, right: 24, left: 18, bottom: 28 }}>
          <defs>
            <linearGradient id={`reportRevenue-${period}`} x1='0' y1='0' x2='0' y2='1'>
              <stop offset='5%' stopColor='#0f766e' stopOpacity={0.96} />
              <stop offset='95%' stopColor='#2dd4bf' stopOpacity={0.82} />
            </linearGradient>
            <linearGradient id={`reportProfit-${period}`} x1='0' y1='0' x2='0' y2='1'>
              <stop offset='5%' stopColor='#2563eb' stopOpacity={0.96} />
              <stop offset='95%' stopColor='#38bdf8' stopOpacity={0.82} />
            </linearGradient>
            <linearGradient id={`reportQuantity-${period}`} x1='0' y1='0' x2='0' y2='1'>
              <stop offset='5%' stopColor='#0891b2' stopOpacity={0.94} />
              <stop offset='95%' stopColor='#67e8f9' stopOpacity={0.8} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='rgba(148, 163, 184, 0.35)' />
          <XAxis dataKey='name' tickMargin={10} interval='preserveStartEnd' tick={{ fill: '#64748b', fontSize: 12 }} />
          <YAxis yAxisId='money' width={104} tickFormatter={(value) => formatReportMoney(Number(value), language)} tick={{ fill: '#64748b', fontSize: 11 }} tickMargin={8} />
          <YAxis yAxisId='count' orientation='right' width={62} tickFormatter={(value) => formatReportNumber(Number(value), language)} tick={{ fill: '#64748b', fontSize: 11 }} tickMargin={8} />
          <Tooltip formatter={(value: number, name: string) => [name === t('quantity') ? formatReportNumber(value, language) : formatReportMoney(value, language), name]} />
          <Bar yAxisId='money' dataKey='revenue' fill={`url(#reportRevenue-${period})`} name={t('totalRevenue')} radius={[8, 8, 0, 0]} />
          <Bar yAxisId='count' dataKey='quantity' fill={`url(#reportQuantity-${period})`} name={t('quantity')} radius={[8, 8, 0, 0]} />
          {period !== 'daily' && <Bar yAxisId='money' dataKey='profit' fill={`url(#reportProfit-${period})`} name={t('totalProfit')} radius={[8, 8, 0, 0]} />}
        </BarChart>
      </ResponsiveContainer>
      <DashboardLegend items={legendItems} />
      <Table
        style={{ marginTop: '1rem' }}
        size='small'
        rowKey={(_, i) => String(i)}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 10 }}
        scroll={{ x: true }}
      />
    </ReportSection>
  );
};

export default SalesPeriodReport;
