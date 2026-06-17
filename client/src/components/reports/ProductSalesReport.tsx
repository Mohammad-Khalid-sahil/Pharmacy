import { Select, Table } from 'antd';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import DashboardLegend from '../DashboardLegend';
import { useGetAllSaleQuery } from '../../redux/features/management/saleApi';
import { useLanguage } from '../../i18n/LanguageContext';
import ReportSection from './ReportSection';
import { DateRange, formatReportMoney, formatReportNumber, inRange } from '../../utils/reportHelpers';

const ProductSalesReport = ({ mode }: { mode: 'best' | 'slow' }) => {
  const { t, language } = useLanguage();
  const legendItems = [
    { label: t('quantity'), color: mode === 'best' ? '#0f766e' : '#f59e0b' },
  ];
  const [range, setRange] = useState<DateRange>({});
  const [productFilter, setProductFilter] = useState<string>();
  const { data, isFetching } = useGetAllSaleQuery({ limit: 1000 });

  const rows = useMemo(() => {
    const map = new Map<string, { productName: string; quantity: number; revenue: number }>();
    (data?.data || []).forEach((sale: { productName: string; quantity: number; totalPrice: number; date?: string }) => {
      if (!inRange(sale.date, range)) return;
      const key = sale.productName || 'Unknown';
      const prev = map.get(key) || { productName: key, quantity: 0, revenue: 0 };
      prev.quantity += sale.quantity || 0;
      prev.revenue += sale.totalPrice || 0;
      map.set(key, prev);
    });
    const list = [...map.values()];
    const filtered = productFilter ? list.filter((item) => item.productName === productFilter) : list;
    filtered.sort((a, b) => (mode === 'best' ? b.quantity - a.quantity : a.quantity - b.quantity));
    return filtered.slice(0, 20);
  }, [data, range, mode, productFilter]);

  const productOptions = useMemo(
    () => [...new Set((data?.data || []).map((sale: { productName: string }) => sale.productName).filter(Boolean))]
      .map((name) => ({ value: name, label: name })),
    [data]
  );

  const totals = useMemo(
    () => ({
      quantity: rows.reduce((a, r) => a + r.quantity, 0),
      revenue: rows.reduce((a, r) => a + r.revenue, 0),
    }),
    [rows]
  );

  const chartData = rows.slice(0, 10).map((r) => ({ name: r.productName, quantity: r.quantity }));

  return (
    <ReportSection
      title={mode === 'best' ? t('reportBestSelling') : t('reportSlowSelling')}
      loading={isFetching}
      range={range}
      onRangeChange={setRange}
      extraFilters={
        <Select
          allowClear
          showSearch
          placeholder={t('productName')}
          style={{ minWidth: 240 }}
          value={productFilter}
          onChange={setProductFilter}
          options={productOptions}
        />
      }
      summary={[
        { label: t('totalQuantity'), value: totals.quantity, type: 'number' },
        { label: t('totalRevenue'), value: totals.revenue, type: 'money' },
      ]}
      error={false}
      isEmpty={rows.length === 0}
    >
      <ResponsiveContainer width='100%' height={280}>
        <BarChart data={chartData} layout='vertical' margin={{ top: 12, right: 18, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray='3 3' horizontal={false} stroke='rgba(148, 163, 184, 0.35)' />
          <XAxis type='number' tickFormatter={(value) => formatReportNumber(Number(value), language)} tick={{ fill: '#64748b', fontSize: 12 }} />
          <YAxis type='category' dataKey='name' width={120} tick={{ fill: '#64748b', fontSize: 12 }} />
          <Tooltip formatter={(value: number) => formatReportNumber(value, language)} />
          <Bar dataKey='quantity' fill={mode === 'best' ? '#0f766e' : '#f59e0b'} name={t('quantity')} radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <DashboardLegend items={legendItems} />
      <Table
        style={{ marginTop: '1rem' }}
        size='small'
        rowKey='productName'
        dataSource={rows}
        pagination={{ pageSize: 10 }}
        scroll={{ x: true }}
        columns={[
          { title: t('productName'), dataIndex: 'productName', key: 'productName' },
          { title: t('quantity'), dataIndex: 'quantity', key: 'quantity', align: 'center', render: (v: number) => formatReportNumber(v, language) },
          { title: t('totalRevenue'), dataIndex: 'revenue', key: 'revenue', align: 'center', render: (v: number) => formatReportMoney(v, language) },
        ]}
      />
    </ReportSection>
  );
};

export default ProductSalesReport;
