import { Table } from 'antd';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import DashboardLegend from '../DashboardLegend';
import { useGetAllExpensesQuery } from '../../redux/features/management/expenseApi';
import { useGetAllSaleQuery } from '../../redux/features/management/saleApi';
import { useGetSaleReturnsQuery } from '../../redux/features/management/saleReturnApi';
import { useGetSalaryPaymentsQuery } from '../../redux/features/management/salaryPaymentApi';
import { useLanguage } from '../../i18n/LanguageContext';
import ReportSection from './ReportSection';
import { DateRange, formatReportMoney, formatReportNumber, inRange } from '../../utils/reportHelpers';

const NetProfitReport = () => {
  const { t, language } = useLanguage();
  const legendItems = [
    { label: t('totalRevenue'), color: '#0f766e' },
    { label: t('totalProfit'), color: '#2563eb' },
    { label: t('totalRefund'), color: '#ef4444' },
    { label: t('totalExpense'), color: '#f59e0b' },
    { label: t('reportSalaryPayments'), color: '#7c3aed' },
    { label: t('netProfit'), color: '#dc2626' },
  ];
  const [range, setRange] = useState<DateRange>({});
  const { data: sales, isFetching: loadingSales } = useGetAllSaleQuery({ limit: 1000 });
  const { data: expenses, isFetching: loadingExpenses } = useGetAllExpensesQuery({ limit: 1000 });
  const { data: returns, isFetching: loadingReturns } = useGetSaleReturnsQuery({ limit: 1000 });
  const { data: salaries, isFetching: loadingSalaries } = useGetSalaryPaymentsQuery({ limit: 1000 });

  const rows = useMemo(() => {
    const salesRows = (sales?.data || []).filter((sale: { date?: string }) => inRange(sale.date, range));
    const revenue = salesRows
      .reduce((sum: number, sale: { totalPrice?: number }) => sum + (sale.totalPrice || 0), 0);
    const grossProfit = salesRows
      .reduce((sum: number, sale: { profit?: number }) => sum + (sale.profit || 0), 0);
    const refund = (returns?.data || [])
      .filter((item: { createdAt?: string }) => inRange(item.createdAt, range))
      .reduce((sum: number, item: { totalRefund?: number }) => sum + (item.totalRefund || 0), 0);
    const returnedProfit = (returns?.data || [])
      .filter((item: { createdAt?: string }) => inRange(item.createdAt, range))
      .reduce((sum: number, item: { sale?: { profit?: number; quantity?: number }; items?: { quantity?: number }[] }) => {
        const saleProfit = Number(item.sale?.profit || 0);
        const saleQuantity = Number(item.sale?.quantity || 0);
        const returnedQuantity = (item.items || []).reduce((acc, row) => acc + Number(row.quantity || 0), 0);
        return saleQuantity > 0 ? sum + (saleProfit / saleQuantity) * returnedQuantity : sum;
      }, 0);
    const expense = (expenses?.data || [])
      .filter((sale: { date?: string }) => inRange(sale.date, range))
      .reduce((sum: number, item: { amount?: number }) => sum + (item.amount || 0), 0);
    const salary = (salaries?.data || [])
      .filter((item: { paymentDate?: string; createdAt?: string }) => inRange(item.paymentDate || item.createdAt, range))
      .reduce((sum: number, item: { amount?: number }) => sum + (item.amount || 0), 0);
    return [{ key: 'net', revenue: revenue - refund, grossProfit, returnedProfit, expense, salary, netProfit: grossProfit - returnedProfit - expense - salary }];
  }, [expenses, range, returns, salaries, sales]);

  const current = rows[0];
  const chartData = [
    { name: t('totalRevenue'), value: current.revenue },
    { name: t('totalProfit'), value: current.grossProfit },
    { name: t('totalRefund'), value: current.returnedProfit },
    { name: t('totalExpense'), value: current.expense },
    { name: t('reportSalaryPayments'), value: current.salary },
    { name: t('netProfit'), value: current.netProfit },
  ];

  return (
    <ReportSection
      title={t('netProfitReport')}
      loading={loadingSales || loadingExpenses || loadingReturns || loadingSalaries}
      range={range}
      onRangeChange={setRange}
      summary={[
        { label: t('totalRevenue'), value: current.revenue, type: 'money' },
        { label: t('totalProfit'), value: current.grossProfit, type: 'money' },
        { label: t('totalRefund'), value: current.returnedProfit, type: 'money' },
        { label: t('totalExpense'), value: current.expense, type: 'money' },
        { label: t('reportSalaryPayments'), value: current.salary, type: 'money' },
        { label: t('netProfit'), value: current.netProfit, type: 'money' },
      ]}
    >
      <ResponsiveContainer width='100%' height={280}>
        <BarChart data={chartData} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='rgba(148, 163, 184, 0.35)' />
          <XAxis dataKey='name' tick={{ fill: '#64748b', fontSize: 12 }} />
          <YAxis tickFormatter={(value) => formatReportNumber(Number(value), language)} tick={{ fill: '#64748b', fontSize: 12 }} />
          <Tooltip formatter={(value: number) => formatReportMoney(value, language)} />
          <Bar dataKey='value' fill='#0f766e' radius={[8, 8, 0, 0]} name={t('amount')} />
        </BarChart>
      </ResponsiveContainer>
      <DashboardLegend items={legendItems} />
      <Table
        style={{ marginTop: '1rem' }}
        rowKey='key'
        size='small'
        dataSource={rows}
        pagination={false}
        scroll={{ x: true }}
        columns={[
          { title: t('totalRevenue'), dataIndex: 'revenue', key: 'revenue', align: 'center', render: (v: number) => formatReportMoney(v, language) },
          { title: t('totalProfit'), dataIndex: 'grossProfit', key: 'grossProfit', align: 'center', render: (v: number) => formatReportMoney(v, language) },
          { title: t('totalRefund'), dataIndex: 'returnedProfit', key: 'returnedProfit', align: 'center', render: (v: number) => formatReportMoney(v, language) },
          { title: t('totalExpense'), dataIndex: 'expense', key: 'expense', align: 'center', render: (v: number) => formatReportMoney(v, language) },
          { title: t('reportSalaryPayments'), dataIndex: 'salary', key: 'salary', align: 'center', render: (v: number) => formatReportMoney(v, language) },
          { title: t('netProfit'), dataIndex: 'netProfit', key: 'netProfit', align: 'center', render: (v: number) => formatReportMoney(v, language) },
        ]}
      />
    </ReportSection>
  );
};

export default NetProfitReport;
