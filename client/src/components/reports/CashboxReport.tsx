import { Table } from 'antd';
import type { TableColumnsType } from 'antd';
import { useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  useGetCashboxSummaryQuery,
  useGetCashboxTransactionsQuery,
} from '../../redux/features/management/cashboxApi';
import { useLanguage } from '../../i18n/LanguageContext';
import formatDate from '../../utils/formatDate';
import DashboardLegend from '../DashboardLegend';
import ReportSection from './ReportSection';
import { DateRange, formatReportMoney, inRange } from '../../utils/reportHelpers';

type CashboxReportRow = {
  _id: string;
  createdAt?: string;
  module?: string;
  sourceModule?: string;
  transactionType?: string;
  type?: string;
  direction: string;
  amount: number;
  balanceAfter?: number;
  description?: string;
};

const CashboxReport = () => {
  const { t, language } = useLanguage();
  const [range, setRange] = useState<DateRange>({});
  const { data: summary, isFetching: loadingSummary } = useGetCashboxSummaryQuery(undefined);
  const { data: txns, isFetching: loadingTxns } = useGetCashboxTransactionsQuery({ limit: 500 });

  const rows = useMemo(
    () =>
      ((txns?.data || []) as CashboxReportRow[]).filter((row) => inRange(row.createdAt, range)),
    [txns, range]
  );

  const filteredTotals = useMemo(() => {
    let cashIn = 0;
    let cashOut = 0;
    rows.forEach((row) => {
      if (row.direction === 'IN') cashIn += row.amount;
      else cashOut += row.amount;
    });
    return { cashIn, cashOut, balance: cashIn - cashOut };
  }, [rows]);

  const display = range.from || range.to ? filteredTotals : summary?.data || { cashIn: 0, cashOut: 0, balance: 0 };

  const columns: TableColumnsType<CashboxReportRow> = [
    { title: t('date'), key: 'date', render: (_, row) => formatDate(row.createdAt || '', language) },
    { title: t('module'), key: 'module', render: (_, row) => row.module || row.sourceModule || '-' },
    { title: t('type'), key: 'type', render: (_, row) => row.transactionType || row.type || '-' },
    { title: t('direction'), dataIndex: 'direction', key: 'direction', align: 'center' },
    { title: t('amount'), dataIndex: 'amount', key: 'amount', align: 'center', render: (v) => formatReportMoney(Number(v || 0), language) },
    { title: t('balanceAfter'), dataIndex: 'balanceAfter', key: 'balanceAfter', align: 'center', render: (v) => formatReportMoney(Number(v || 0), language) },
    { title: t('note'), dataIndex: 'description', key: 'description', render: (v) => v || '-' },
  ];

  return (
    <ReportSection
      title={t('reportCashbox')}
      loading={loadingSummary || loadingTxns}
      range={range}
      onRangeChange={setRange}
      summary={[
        { label: t('cashIn'), value: display.cashIn ?? 0, type: 'money' },
        { label: t('cashOut'), value: display.cashOut ?? 0, type: 'money' },
        { label: t('balance'), value: display.balance ?? 0, type: 'money' },
      ]}
    >
      <ResponsiveContainer width='100%' height={240}>
        <PieChart>
          <Pie
            data={[{ name: t('cashIn'), value: display.cashIn || 0 }, { name: t('cashOut'), value: display.cashOut || 0 }]}
            dataKey='value'
            nameKey='name'
            innerRadius={58}
            outerRadius={88}
            paddingAngle={4}
          >
            <Cell fill='#16a34a' />
            <Cell fill='#f59e0b' />
          </Pie>
          <Tooltip formatter={(value: number) => formatReportMoney(value, language)} />
        </PieChart>
      </ResponsiveContainer>
      <DashboardLegend
        items={[
          { label: t('cashIn'), color: '#16a34a' },
          { label: t('cashOut'), color: '#f59e0b' },
        ]}
      />
      <Table
        style={{ marginTop: '1rem' }}
        size='small'
        rowKey='_id'
        dataSource={rows}
        pagination={{ pageSize: 10 }}
        scroll={{ x: true }}
        columns={columns}
      />
    </ReportSection>
  );
};

export default CashboxReport;
