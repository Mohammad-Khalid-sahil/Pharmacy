import { Select, Table } from 'antd';
import { useMemo, useState } from 'react';
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import {
  useGetCustomerDebtorAccountsQuery,
  useGetCustomerLedgersQuery,
  useGetCustomersQuery,
} from '../../redux/features/management/customerApi';
import { useLanguage } from '../../i18n/LanguageContext';
import ReportSection from './ReportSection';
import { DateRange, formatReportMoney, inRange } from '../../utils/reportHelpers';

const CustomerDebtReport = () => {
  const { t, language } = useLanguage();
  const [range, setRange] = useState<DateRange>({});
  const [customerFilter, setCustomerFilter] = useState<string>();
  const { data: ledgers, isFetching: loadingLedgers } = useGetCustomerLedgersQuery({ limit: 500 });
  const { data: debtorAccounts, isFetching: loadingDebtors } = useGetCustomerDebtorAccountsQuery({ status: 'active', limit: 500 });
  const { data: customers } = useGetCustomersQuery({ limit: 500 });

  const nameById = useMemo(() => {
    const map: Record<string, string> = {};
    (customers?.data || []).forEach((c: { _id: string; name: string }) => {
      map[c._id] = c.name;
    });
    return map;
  }, [customers]);

  const rows = useMemo(() => {
    const map = new Map<string, { customerId: string; name: string; debit: number; credit: number }>();

    (ledgers?.data || []).forEach(
      (row: {
        customer: string | { _id: string; name?: string };
        type: string;
        amount: number;
        createdAt?: string;
      }) => {
        if (!inRange(row.createdAt, range)) return;
        const customerId = typeof row.customer === 'object' ? row.customer._id : row.customer;
        const name =
          (typeof row.customer === 'object' && row.customer.name) || nameById[customerId] || customerId;
        if (!map.has(customerId)) map.set(customerId, { customerId, name, debit: 0, credit: 0 });
        const entry = map.get(customerId)!;
        if (row.type === 'DEBIT') entry.debit += row.amount;
        else entry.credit += row.amount;
      }
    );

    (debtorAccounts?.data || []).forEach(
      (account: {
        _id: string;
        customerId?: string;
        customerName: string;
        currentDebt: number;
        totalPayments: number;
        lastDebtDate?: string;
        accountCreatedAt?: string;
      }) => {
        const activityDate = account.lastDebtDate || account.accountCreatedAt;
        if (!inRange(activityDate, range)) return;
        if (account.customerId && map.has(account.customerId)) return;

        const customerId = account.customerId || `debtor:${account._id}`;
        const name = account.customerName;
        if (!map.has(customerId)) map.set(customerId, { customerId, name, debit: 0, credit: 0 });
        const entry = map.get(customerId)!;
        entry.debit += Number(account.currentDebt || 0) + Number(account.totalPayments || 0);
        entry.credit += Number(account.totalPayments || 0);
        entry.name = name;
      }
    );

    return [...map.values()]
      .map((r) => ({ ...r, balance: Math.max(r.debit - r.credit, 0) }))
      .filter((r) => r.balance > 0)
      .filter((r) => !customerFilter || r.customerId === customerFilter)
      .sort((a, b) => b.balance - a.balance);
  }, [customerFilter, debtorAccounts?.data, ledgers, nameById, range]);

  const totalDebt = rows.reduce((a, r) => a + r.balance, 0);

  return (
    <ReportSection
      title={t('reportCustomerDebt')}
      loading={loadingLedgers || loadingDebtors}
      range={range}
      onRangeChange={setRange}
      extraFilters={
        <Select
          allowClear
          placeholder={t('customers')}
          style={{ minWidth: 220 }}
          value={customerFilter}
          onChange={setCustomerFilter}
          options={(customers?.data || []).map((c: { _id: string; name: string }) => ({ value: c._id, label: c.name }))}
        />
      }
      summary={[
        { label: t('customersWithDebt'), value: rows.length, type: 'number' },
        { label: t('totalDebt'), value: totalDebt, type: 'money' },
      ]}
      error={false}
      isEmpty={rows.length === 0}
    >
      <ResponsiveContainer width='100%' height={260}>
        <PieChart>
          <Pie data={rows.slice(0, 6)} dataKey='balance' nameKey='name' innerRadius={58} outerRadius={95} paddingAngle={3}>
            {rows.slice(0, 6).map((row, index) => (
              <Cell key={row.customerId} fill={['#0f766e', '#2563eb', '#f59e0b', '#dc2626', '#16a34a', '#38bdf8'][index % 6]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => formatReportMoney(value, language)} />
        </PieChart>
      </ResponsiveContainer>
      <Table
        style={{ marginTop: '1rem' }}
        size='small'
        rowKey='customerId'
        dataSource={rows}
        pagination={{ pageSize: 10 }}
        scroll={{ x: true }}
        columns={[
          { title: t('name'), dataIndex: 'name', key: 'name' },
          { title: t('debit'), dataIndex: 'debit', key: 'debit', align: 'center', render: (v: number) => formatReportMoney(v, language) },
          { title: t('credit'), dataIndex: 'credit', key: 'credit', align: 'center', render: (v: number) => formatReportMoney(v, language) },
          { title: t('balance'), dataIndex: 'balance', key: 'balance', align: 'center', render: (v: number) => formatReportMoney(v, language) },
        ]}
      />
    </ReportSection>
  );
};

export default CustomerDebtReport;
