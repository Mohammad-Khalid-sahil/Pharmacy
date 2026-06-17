import { Table } from 'antd';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useGetAllExpensesQuery } from '../../redux/features/management/expenseApi';
import { useLanguage } from '../../i18n/LanguageContext';
import DashboardLegend from '../DashboardLegend';
import ReportSection from './ReportSection';
import { DateRange, formatReportMoney, formatReportNumber, inRange } from '../../utils/reportHelpers';
import formatDate from '../../utils/formatDate';

const ExpenseReport = () => {
  const { t, language } = useLanguage();
  const [range, setRange] = useState<DateRange>({});
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data, isFetching } = useGetAllExpensesQuery({ page: 1, limit: 1000, timeZone });

  const rows = useMemo(
    () => (data?.data || []).filter((row: { date?: string }) => inRange(row.date, range)),
    [data, range]
  );

  const total = rows.reduce((a: number, r: { amount: number }) => a + (r.amount || 0), 0);
  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row: { date?: string; createdAt?: string; amount?: number }) => {
      const key = formatDate(row.date || row.createdAt || '', language);
      map.set(key, (map.get(key) || 0) + (row.amount || 0));
    });
    return [...map.entries()].map(([name, value]) => ({ name, value })).slice(0, 10);
  }, [language, rows]);

  return (
    <ReportSection
      title={t('reportExpenses')}
      loading={isFetching}
      range={range}
      onRangeChange={setRange}
      summary={[
        { label: t('records'), value: rows.length, type: 'number' },
        { label: t('totalExpense'), value: total, type: 'money' },
      ]}
    >
      <ResponsiveContainer width='100%' height={260}>
        <BarChart data={chartData} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='rgba(148, 163, 184, 0.35)' />
          <XAxis dataKey='name' tick={{ fill: '#64748b', fontSize: 12 }} />
          <YAxis tickFormatter={(value) => formatReportNumber(Number(value), language)} tick={{ fill: '#64748b', fontSize: 12 }} />
          <Tooltip formatter={(value: number) => formatReportMoney(value, language)} />
          <Bar dataKey='value' fill='#f59e0b' name={t('expenseAmount')} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <DashboardLegend items={[{ label: t('expenseAmount'), color: '#f59e0b' }]} />
      <Table
        style={{ marginTop: '1rem' }}
        size='small'
        rowKey='_id'
        dataSource={rows}
        pagination={{ pageSize: 10 }}
        scroll={{ x: true }}
        columns={[
          { title: t('title'), dataIndex: 'title', key: 'title' },
          { title: t('amount'), dataIndex: 'amount', key: 'amount', align: 'center', render: (v: number) => formatReportMoney(v, language) },
          { title: t('date'), dataIndex: 'date', key: 'date' },
          { title: t('note'), dataIndex: 'note', key: 'note', render: (v: string) => v || '-' },
        ]}
      />
    </ReportSection>
  );
};

export default ExpenseReport;
