import { Table } from 'antd';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useGetSalaryPaymentsQuery } from '../../redux/features/management/salaryPaymentApi';
import { useGetEmployeesQuery } from '../../redux/features/management/employeeApi';
import { useLanguage } from '../../i18n/LanguageContext';
import formatDate from '../../utils/formatDate';
import DashboardLegend from '../DashboardLegend';
import ReportSection from './ReportSection';
import { DateRange, formatReportMoney, formatReportNumber, inRange } from '../../utils/reportHelpers';

const SalaryPaymentReport = () => {
  const { t, language } = useLanguage();
  const [range, setRange] = useState<DateRange>({});
  const { data, isFetching } = useGetSalaryPaymentsQuery({ limit: 500 });
  const { data: employees } = useGetEmployeesQuery({ limit: 500 });

  const nameById = useMemo(() => {
    const map: Record<string, string> = {};
    (employees?.data || []).forEach((e: { _id: string; name: string }) => {
      map[e._id] = e.name;
    });
    return map;
  }, [employees]);

  const rows = useMemo(
    () =>
      (data?.data || []).filter((row: { paymentDate?: string; createdAt?: string }) =>
        inRange(row.paymentDate || row.createdAt, range)
      ),
    [data, range]
  );

  const total = rows.reduce((a: number, r: { amount: number }) => a + (r.amount || 0), 0);
  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row: { amount?: number; paymentDate?: string; createdAt?: string }) => {
      const key = formatDate(row.paymentDate || row.createdAt || '', language);
      map.set(key, (map.get(key) || 0) + (row.amount || 0));
    });
    return [...map.entries()].map(([name, value]) => ({ name, value })).slice(-10);
  }, [language, rows]);

  return (
    <ReportSection
      title={t('reportSalaryPayments')}
      loading={isFetching}
      range={range}
      onRangeChange={setRange}
      summary={[
        { label: t('records'), value: rows.length, type: 'number' },
        { label: t('totalAmount'), value: total, type: 'money' },
      ]}
    >
      <ResponsiveContainer width='100%' height={260}>
        <BarChart data={chartData} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='rgba(148, 163, 184, 0.35)' />
          <XAxis dataKey='name' tick={{ fill: '#64748b', fontSize: 12 }} />
          <YAxis tickFormatter={(value) => formatReportNumber(Number(value), language)} tick={{ fill: '#64748b', fontSize: 12 }} />
          <Tooltip formatter={(value: number) => formatReportMoney(value, language)} />
          <Bar dataKey='value' fill='#2563eb' name={t('salary')} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <DashboardLegend items={[{ label: t('salary'), color: '#2563eb' }]} />
      <Table<any>
        style={{ marginTop: '1rem' }}
        size='small'
        rowKey='_id'
        dataSource={rows}
        pagination={{ pageSize: 10 }}
        scroll={{ x: true }}
        columns={[
          {
            title: t('employee'),
            key: 'employee',
            render: (_: unknown, row: { employee: string | { _id: string; name?: string } }) => {
              if (typeof row.employee === 'object' && row.employee?.name) return row.employee.name;
              return nameById[row.employee as string] || '-';
            },
          },
          { title: t('amount'), dataIndex: 'amount', key: 'amount', align: 'center', render: (v: number) => formatReportMoney(v, language) },
          {
            title: t('date'),
            key: 'date',
            render: (_: unknown, row: { paymentDate?: string; createdAt?: string }) =>
              formatDate(row.paymentDate || row.createdAt || '', language),
          },
        ]}
      />
    </ReportSection>
  );
};

export default SalaryPaymentReport;
