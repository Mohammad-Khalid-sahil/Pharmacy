import { Select, Table, Tag } from 'antd';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useGetAllProductsQuery } from '../../redux/features/management/productApi';
import { useLanguage } from '../../i18n/LanguageContext';
import DashboardLegend from '../DashboardLegend';
import ReportSection from './ReportSection';
import { formatReportMoney, formatReportNumber } from '../../utils/reportHelpers';

const InventoryReport = () => {
  const { t, language } = useLanguage();
  const [status, setStatus] = useState<string>();
  const { data, isFetching, error } = useGetAllProductsQuery({ limit: 1000 });

  const rows = useMemo(() => {
    const now = new Date();
    return (data?.data || [])
      .map((product: any) => ({
        ...product,
        status:
          product.expireDate && new Date(product.expireDate) < now
            ? 'expired'
            : product.stock <= (product.minStock || 0)
              ? 'low'
              : 'healthy',
        inventoryValue: (product.stock || 0) * (product.purchasePrice || product.price || 0),
      }))
      .filter((product: { status: string }) => !status || product.status === status);
  }, [data, status]);

  const totals = rows.reduce(
    (acc: { stock: number; value: number; low: number; expired: number }, row: any) => ({
      stock: acc.stock + (row.stock || 0),
      value: acc.value + (row.inventoryValue || 0),
      low: acc.low + (row.status === 'low' ? 1 : 0),
      expired: acc.expired + (row.status === 'expired' ? 1 : 0),
    }),
    { stock: 0, value: 0, low: 0, expired: 0 }
  );

  const chartData = rows.slice(0, 12).map((row: any) => ({ name: row.name, stock: row.stock || 0 }));

  return (
    <ReportSection
      title={t('inventoryReport')}
      loading={isFetching}
      range={{}}
      onRangeChange={() => {}}
      showDateFilter={false}
      extraFilters={
        <Select
          allowClear
          placeholder={t('inventoryStatus')}
          style={{ minWidth: 200 }}
          value={status}
          onChange={setStatus}
          options={[
            { value: 'healthy', label: t('healthy') },
            { value: 'low', label: t('reportLowStock') },
            { value: 'expired', label: t('expiredMedicines') },
          ]}
        />
      }
      summary={[
        { label: t('products'), value: rows.length, type: 'number' },
        { label: t('stock'), value: totals.stock, type: 'number' },
        { label: t('inventoryValue'), value: totals.value, type: 'money' },
        { label: t('expiredMedicines'), value: totals.expired, type: 'number' },
      ]}
      error={error}
      isEmpty={rows.length === 0}
    >
      <ResponsiveContainer width='100%' height={280}>
        <BarChart data={chartData} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='rgba(148, 163, 184, 0.35)' />
          <XAxis dataKey='name' tick={{ fill: '#64748b', fontSize: 12 }} />
          <YAxis tickFormatter={(value) => formatReportNumber(Number(value), language)} tick={{ fill: '#64748b', fontSize: 12 }} />
          <Tooltip formatter={(value: number) => formatReportNumber(value, language)} />
          <Bar dataKey='stock' fill='#0f766e' radius={[8, 8, 0, 0]} name={t('stock')} />
        </BarChart>
      </ResponsiveContainer>
      <DashboardLegend items={[{ label: t('stock'), color: '#0f766e' }]} />
      <Table
        style={{ marginTop: '1rem' }}
        size='small'
        rowKey='_id'
        dataSource={rows}
        pagination={{ pageSize: 10 }}
        scroll={{ x: true }}
        columns={[
          { title: t('productName'), dataIndex: 'name', key: 'name' },
          { title: t('stock'), dataIndex: 'stock', key: 'stock', align: 'center', render: (v: number) => formatReportNumber(v, language) },
          { title: t('minStock'), dataIndex: 'minStock', key: 'minStock', align: 'center', render: (v: number) => formatReportNumber(v, language) },
          { title: t('purchasePrice'), dataIndex: 'purchasePrice', key: 'purchasePrice', align: 'center', render: (v: number) => formatReportMoney(v, language) },
          { title: t('salePrice'), dataIndex: 'price', key: 'price', align: 'center', render: (v: number) => formatReportMoney(v, language) },
          { title: t('inventoryValue'), dataIndex: 'inventoryValue', key: 'inventoryValue', align: 'center', render: (v: number) => formatReportMoney(v, language) },
          {
            title: t('status'),
            dataIndex: 'status',
            key: 'status',
            align: 'center',
            render: (value: string) => <Tag color={value === 'expired' ? 'error' : value === 'low' ? 'warning' : 'success'}>{value === 'expired' ? t('expiredMedicines') : value === 'low' ? t('reportLowStock') : t('healthy')}</Tag>,
          },
        ]}
      />
    </ReportSection>
  );
};

export default InventoryReport;
