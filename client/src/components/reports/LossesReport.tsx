import { Table } from 'antd';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useGetSaleReturnsQuery } from '../../redux/features/management/saleReturnApi';
import { useLanguage } from '../../i18n/LanguageContext';
import DashboardLegend from '../DashboardLegend';
import ReportSection from './ReportSection';
import { DateRange, formatReportMoney, formatReportNumber, inRange } from '../../utils/reportHelpers';
import formatDate from '../../utils/formatDate';

const LossesReport = () => {
  const { t, language } = useLanguage();
  const [range, setRange] = useState<DateRange>({});
  const { data, isFetching } = useGetSaleReturnsQuery({ limit: 1000 });

  const rows = useMemo(
    () =>
      (data?.data || [])
        .filter((row: { createdAt?: string }) => inRange(row.createdAt, range))
        .map((row: any) => ({
          key: row._id,
          date: row.createdAt,
          productName: row.productName || row.sale?.productName || t('unknown'),
          quantity: Number(row.quantity || 0),
          lossAmount: Number(row.totalRefund || row.amount || 0),
          reason: row.reason || row.note || '-',
        })),
    [data, range, t],
  );

  const totalLoss = rows.reduce((sum: number, row: { lossAmount: number }) => sum + row.lossAmount, 0);
  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row: { date?: string; lossAmount: number }) => {
      const key = formatDate(row.date || '', language);
      map.set(key, (map.get(key) || 0) + row.lossAmount);
    });
    return [...map.entries()].map(([name, value]) => ({ name, value })).slice(0, 10);
  }, [language, rows]);

  return (
    <ReportSection
      title={t('reportLosses')}
      loading={isFetching}
      range={range}
      onRangeChange={setRange}
      summary={[
        { label: t('records'), value: rows.length, type: 'number' },
        { label: t('totalLosses'), value: totalLoss, type: 'money' },
      ]}
    >
      <ResponsiveContainer width='100%' height={260}>
        <BarChart data={chartData} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='rgba(148, 163, 184, 0.35)' />
          <XAxis dataKey='name' tick={{ fill: '#64748b', fontSize: 12 }} />
          <YAxis tickFormatter={(value) => formatReportNumber(Number(value), language)} tick={{ fill: '#64748b', fontSize: 12 }} />
          <Tooltip formatter={(value: number) => formatReportMoney(value, language)} />
          <Bar dataKey='value' fill='#ef4444' name={t('totalLosses')} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <DashboardLegend items={[{ label: t('totalLosses'), color: '#ef4444' }]} />
      <Table
        size='small'
        rowKey='key'
        dataSource={rows}
        pagination={{ pageSize: 10 }}
        scroll={{ x: true }}
        columns={[
          { title: t('date'), dataIndex: 'date', key: 'date', render: (v: string) => formatDate(v, language) },
          { title: t('productName'), dataIndex: 'productName', key: 'productName' },
          { title: t('quantity'), dataIndex: 'quantity', key: 'quantity', align: 'center', render: (v: number) => formatReportNumber(v, language) },
          { title: t('lossAmount'), dataIndex: 'lossAmount', key: 'lossAmount', align: 'center', render: (v: number) => formatReportMoney(v, language) },
          { title: t('reason'), dataIndex: 'reason', key: 'reason' },
        ]}
      />
    </ReportSection>
  );
};

export default LossesReport;
