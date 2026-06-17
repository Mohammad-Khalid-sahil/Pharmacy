import { CalendarOutlined } from '@ant-design/icons';
import { Flex, Pagination, Select, Table } from 'antd';
import { useMemo, useState } from 'react';
import { useGetSalaryPaymentsQuery } from '../../redux/features/management/salaryPaymentApi';
import { useGetEmployeesQuery } from '../../redux/features/management/employeeApi';
import { useLanguage } from '../../i18n/LanguageContext';
import formatDate from '../../utils/formatDate';
import { ISalaryPayment } from '../../types/salaryPayment.types';
import { formatCurrencyByLanguage } from '../../utils/formatters';

const SalaryPaymentHistoryTable = () => {
  const { t, language } = useLanguage();
  const formatMoney = (value: number) => formatCurrencyByLanguage(value, language);
  const [query, setQuery] = useState<{ page: number; limit: number; employee?: string }>({
    page: 1,
    limit: 10,
  });
  const { data, isFetching } = useGetSalaryPaymentsQuery(query);
  const { data: employeesData } = useGetEmployeesQuery({ limit: 200 });

  const employeeNameById = useMemo(() => {
    const map: Record<string, string> = {};
    (employeesData?.data || []).forEach((e: { _id: string; name: string }) => {
      map[e._id] = e.name;
    });
    return map;
  }, [employeesData]);

  const resolveEmployeeName = (row: ISalaryPayment) => {
    if (typeof row.employee === 'object' && row.employee?.name) return row.employee.name;
    const id = typeof row.employee === 'string' ? row.employee : '';
    return employeeNameById[id] || '-';
  };

  const columns = [
    {
      title: t('date'),
      key: 'date',
      render: (_: unknown, row: ISalaryPayment) =>
        formatDate(row.paymentDate || row.createdAt || '', language),
    },
    {
      title: t('employee'),
      key: 'employee',
      render: (_: unknown, row: ISalaryPayment) => resolveEmployeeName(row),
    },
    {
      title: t('amount'),
      dataIndex: 'amount',
      key: 'amount',
      align: 'center' as const,
      render: (value: number) => <span className='employee-money'>{formatMoney(value)}</span>,
    },
    {
      title: t('note'),
      dataIndex: 'note',
      key: 'note',
      render: (v: string) => v || '-',
    },
  ];

  const employeeFilterOptions = (employeesData?.data || []).map((e: { _id: string; name: string }) => ({
    value: e._id,
    label: e.name,
  }));

  return (
    <div className='salary-history-card'>
      <Flex justify='space-between' align='center' wrap='wrap' gap={12} className='salary-history-toolbar'>
        <div className='salary-history-title'>
          <CalendarOutlined />
          <h2>{t('salaryPaymentHistory')}</h2>
        </div>
        <Select
          allowClear
          size='large'
          placeholder={t('filterByEmployee')}
          className='salary-history-filter'
          options={employeeFilterOptions}
          onChange={(value) =>
            setQuery((prev) => ({
              ...prev,
              page: 1,
              employee: value || undefined,
            }))
          }
        />
      </Flex>
      <Table
        size='middle'
        loading={isFetching}
        columns={columns}
        dataSource={data?.data || []}
        rowKey='_id'
        pagination={false}
        scroll={{ x: 850 }}
      />
      <Flex justify='center' className='employee-pagination'>
        <Pagination
          current={query.page}
          pageSize={query.limit}
          total={data?.meta?.total || 0}
          onChange={(page) => setQuery((prev) => ({ ...prev, page }))}
        />
      </Flex>
    </div>
  );
};

export default SalaryPaymentHistoryTable;
