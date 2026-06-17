import { Select, Table } from 'antd';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useGetSellerLedgersQuery } from '../../redux/features/management/cashboxApi';
import { useGetAllSellerQuery } from '../../redux/features/management/sellerApi';
import { useLanguage } from '../../i18n/LanguageContext';
import ReportSection from './ReportSection';
import { DateRange, formatReportMoney, formatReportNumber, inRange } from '../../utils/reportHelpers';

const SellerBalanceReport = () => {
  const { t, language } = useLanguage();
  const [range, setRange] = useState<DateRange>({});
  const [sellerFilter, setSellerFilter] = useState<string>();
  const { data: ledgers, isFetching } = useGetSellerLedgersQuery({ limit: 500 });
  const { data: sellers } = useGetAllSellerQuery({ limit: 500 });

  const nameById = useMemo(() => {
    const map: Record<string, string> = {};
    (sellers?.data || []).forEach((s: { _id: string; name: string }) => {
      map[s._id] = s.name;
    });
    return map;
  }, [sellers]);

  const rows = useMemo(() => {
    const map = new Map<string, { sellerId: string; name: string; purchases: number; payments: number }>();
    (ledgers?.data || []).forEach(
      (row: {
        seller: string | { _id: string; name?: string };
        type: string;
        amount: number;
        createdAt?: string;
      }) => {
        if (!inRange(row.createdAt, range)) return;
        const sellerId = typeof row.seller === 'object' ? row.seller._id : row.seller;
        const name =
          (typeof row.seller === 'object' && row.seller.name) || nameById[sellerId] || sellerId;
        if (!map.has(sellerId)) map.set(sellerId, { sellerId, name, purchases: 0, payments: 0 });
        const entry = map.get(sellerId)!;
        if (row.type === 'PURCHASE') entry.purchases += row.amount;
        else if (row.type === 'PAYMENT') entry.payments += row.amount;
      }
    );
    return [...map.values()]
      .map((r) => ({ ...r, balance: r.purchases - r.payments }))
      .filter((r) => !sellerFilter || r.sellerId === sellerFilter)
      .sort((a, b) => b.balance - a.balance);
  }, [ledgers, nameById, range, sellerFilter]);

  const totalPayable = rows.reduce((a, r) => a + Math.max(r.balance, 0), 0);

  return (
    <ReportSection
      title={t('reportSellerBalance')}
      loading={isFetching}
      range={range}
      onRangeChange={setRange}
      extraFilters={
        <Select
          allowClear
          placeholder={t('sellers')}
          style={{ minWidth: 220 }}
          value={sellerFilter}
          onChange={setSellerFilter}
          options={(sellers?.data || []).map((s: { _id: string; name: string }) => ({ value: s._id, label: s.name }))}
        />
      }
      summary={[
        { label: t('sellers'), value: rows.length, type: 'number' },
        { label: t('totalPayable'), value: totalPayable, type: 'money' },
      ]}
      error={false}
      isEmpty={rows.length === 0}
    >
      <ResponsiveContainer width='100%' height={260}>
        <BarChart data={rows.slice(0, 8)} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='rgba(148, 163, 184, 0.35)' />
          <XAxis dataKey='name' tick={{ fill: '#64748b', fontSize: 12 }} />
          <YAxis tickFormatter={(value) => formatReportNumber(Number(value), language)} tick={{ fill: '#64748b', fontSize: 12 }} />
          <Tooltip formatter={(value: number) => formatReportMoney(value, language)} />
          <Bar dataKey='balance' fill='#0f766e' radius={[8, 8, 0, 0]} name={t('remainingPayableBalance')} />
        </BarChart>
      </ResponsiveContainer>
      <Table
        style={{ marginTop: '1rem' }}
        size='small'
        rowKey='sellerId'
        dataSource={rows}
        pagination={{ pageSize: 10 }}
        scroll={{ x: true }}
        columns={[
          { title: t('sellerName'), dataIndex: 'name', key: 'name' },
          { title: t('totalPurchases'), dataIndex: 'purchases', key: 'purchases', align: 'center', render: (v: number) => formatReportMoney(v, language) },
          { title: t('totalPayments'), dataIndex: 'payments', key: 'payments', align: 'center', render: (v: number) => formatReportMoney(v, language) },
          { title: t('remainingPayableBalance'), dataIndex: 'balance', key: 'balance', align: 'center', render: (v: number) => formatReportMoney(v, language) },
        ]}
      />
    </ReportSection>
  );
};

export default SellerBalanceReport;
