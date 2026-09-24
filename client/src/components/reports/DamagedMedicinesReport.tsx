import { Table, Tag } from 'antd';
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useGetAllProductsQuery } from '../../redux/features/management/productApi';
import { useLanguage } from '../../i18n/LanguageContext';
import DashboardLegend from '../DashboardLegend';
import ReportSection from './ReportSection';
import { formatReportMoney, formatReportNumber } from '../../utils/reportHelpers';
import formatDate from '../../utils/formatDate';

const DamagedMedicinesReport = () => {
  const { t, language } = useLanguage();
  const { data, isFetching } = useGetAllProductsQuery({ limit: 1000 });

  const rows = useMemo(() => {
    const now = new Date();
    return (data?.data || [])
      .map((product: any) => {
        const isExpired = product.expireDate && new Date(product.expireDate) < now;
        const isLowStock = Number(product.stock || 0) <= Number(product.minStock || 0);
        const damageType = isExpired ? 'expired' : isLowStock ? 'lowStock' : null;
        if (!damageType) return null;
        const lossValue = Number(product.stock || 0) * Number(product.purchasePrice || product.price || 0);
        return {
          key: product._id,
          name: product.name,
          stock: Number(product.stock || 0),
          damageType,
          expireDate: product.expireDate,
          lossValue,
        };
      })
      .filter(Boolean);
  }, [data]);

  const totalLossValue = rows.reduce((sum: number, row: any) => sum + row.lossValue, 0);

  const chartData = rows.slice(0, 12).map((row: any) => ({
    name: row.name,
    value: row.lossValue,
  }));

  return (
    <ReportSection
      title={t('reportDamagedMedicines')}
      loading={isFetching}
      range={{}}
      onRangeChange={() => {}}
      showDateFilter={false}
      summary={[
        { label: t('records'), value: rows.length, type: 'number' },
        { label: t('totalLosses'), value: totalLossValue, type: 'money' },
      ]}
    >
      <ResponsiveContainer width='100%' height={260}>
        <BarChart data={chartData} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='rgba(148, 163, 184, 0.35)' />
          <XAxis dataKey='name' tick={{ fill: '#64748b', fontSize: 12 }} />
          <YAxis tickFormatter={(value) => formatReportNumber(Number(value), language)} tick={{ fill: '#64748b', fontSize: 12 }} />
          <Tooltip formatter={(value: number) => formatReportMoney(value, language)} />
          <Bar dataKey='value' fill='#dc2626' name={t('lossAmount')} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <DashboardLegend items={[{ label: t('lossAmount'), color: '#dc2626' }]} />
      <Table
        size='small'
        rowKey='key'
        dataSource={rows}
        pagination={{ pageSize: 10 }}
        scroll={{ x: true }}
        columns={[
          { title: t('medicineName'), dataIndex: 'name', key: 'name' },
          { title: t('stock'), dataIndex: 'stock', key: 'stock', align: 'center', render: (v: number) => formatReportNumber(v, language) },
          {
            title: t('status'),
            dataIndex: 'damageType',
            key: 'damageType',
            render: (v: string) => (
              <Tag color={v === 'expired' ? 'error' : 'warning'}>
                {v === 'expired' ? t('expiredMedicines') : t('reportLowStock')}
              </Tag>
            ),
          },
          { title: t('expireDate'), dataIndex: 'expireDate', key: 'expireDate', render: (v: string) => (v ? formatDate(v, language) : '-') },
          { title: t('lossAmount'), dataIndex: 'lossValue', key: 'lossValue', align: 'center', render: (v: number) => formatReportMoney(v, language) },
        ]}
      />
    </ReportSection>
  );
};

export default DamagedMedicinesReport;
