import {
  CalendarOutlined,
  DeleteFilled,
  WalletOutlined,
} from '@ant-design/icons';
import {
  Button,
  Col,
  DatePicker,
  Flex,
  Modal,
  Pagination,
  Row,
  Statistic,
  Table,
  TableColumnsType,
} from 'antd';
import { FieldValues, useForm } from 'react-hook-form';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useMemo, useState } from 'react';
import CustomInput from '../components/CustomInput';
import SearchInput from '../components/SearchInput';
import { useLanguage } from '../i18n/LanguageContext';
import toastMessage from '../lib/toastMessage';
import {
  useCreateExpenseMutation,
  useDeleteExpenseMutation,
  useGetAllExpensesQuery,
  useGetExpenseSummaryQuery,
} from '../redux/features/management/expenseApi';
import formatDate from '../utils/formatDate';
import { formatCurrencyByLanguage, formatNumberByLanguage } from '../utils/formatters';
import { isValidLocalizedNumber, parseLocalizedNumber } from '../utils/numberNormalizer';

const { RangePicker } = DatePicker;

type ExpenseRow = {
  key: string;
  _id: string;
  title: string;
  amount: number;
  date: string;
  rawDate: string;
  note?: string;
};

const parseExpenseDate = (date: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(date);
};

const getMonthKey = (date: string) => {
  const value = parseExpenseDate(date);
  if (Number.isNaN(value.getTime())) return '';
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
};

const startOfLocalDay = (date: string) => {
  const value = parseExpenseDate(date);
  if (Number.isNaN(value.getTime())) return Number.NaN;
  value.setHours(0, 0, 0, 0);
  return value.getTime();
};

const endOfLocalDay = (date: string) => {
  const value = parseExpenseDate(date);
  if (Number.isNaN(value.getTime())) return Number.NaN;
  value.setHours(23, 59, 59, 999);
  return value.getTime();
};

const ExpenseManagementPage = () => {
  const { t, language } = useLanguage();
  const formatNumber = (value: number) => formatNumberByLanguage(value, language);
  const formatMoney = (value: number) => formatCurrencyByLanguage(value, language);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [query, setQuery] = useState({ page: 1, limit: 10, search: '' });
  const [searchInput, setSearchInput] = useState('');
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});
  const [rangePickerKey, setRangePickerKey] = useState(0);
  const { data, isFetching } = useGetAllExpensesQuery({ ...query, timeZone });
  const { data: allExpenses, isFetching: isSummaryFetching } = useGetAllExpensesQuery({ page: 1, limit: 500, timeZone });
  const { data: summaryData } = useGetExpenseSummaryQuery({ timeZone });
  const [createExpense, { isLoading: isCreating }] = useCreateExpenseMutation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const onSubmit = async (values: FieldValues) => {
    try {
      const res = await createExpense({ ...values, amount: parseLocalizedNumber(values.amount) }).unwrap();
      toastMessage({ icon: 'success', text: res.message });
      reset();
    } catch (error: any) {
      toastMessage({ icon: 'error', text: error.data.message });
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    setDateRange({});
    setRangePickerKey((prev) => prev + 1);
    setQuery((prev) => ({ ...prev, page: 1, search: '' }));
  };

  const mapExpense = (item: any): ExpenseRow => ({
    ...item,
    key: item._id,
    amount: Number(item.amount || 0),
    date: formatDate(item.date, language),
    rawDate: item.date,
  });

  const tableData = useMemo<ExpenseRow[]>(
    () => (data?.data || []).map((item: any) => mapExpense(item)),
    [data?.data, t],
  );

  const reportRows = useMemo<ExpenseRow[]>(
    () => (allExpenses?.data || []).map((item: any) => mapExpense(item)),
    [allExpenses?.data, t],
  );



  const filteredTableData = useMemo(() => {
    return tableData.filter((expense) => {
      const expenseTime = startOfLocalDay(expense.rawDate);
      const matchesStart = dateRange.start
        ? expenseTime >= startOfLocalDay(dateRange.start)
        : true;
      const matchesEnd = dateRange.end
        ? expenseTime <= endOfLocalDay(dateRange.end)
        : true;

      return matchesStart && matchesEnd;
    });
  }, [dateRange.end, dateRange.start, tableData]);

  const summary = useMemo(() => {
    const byMonth = new Map<string, number>();

    reportRows.forEach((expense) => {
      const monthKey = getMonthKey(expense.rawDate);
      if (monthKey) byMonth.set(monthKey, (byMonth.get(monthKey) || 0) + expense.amount);
    });

    const monthlyRows = [...byMonth.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(-8);

    const totals = summaryData?.data || allExpenses?.summary || {};

    return {
      todayExpense: Number(totals.todayExpense || 0),
      weeklyExpense: Number(totals.weeklyExpense || 0),
      monthlyExpense: Number(totals.monthlyExpense || 0),
      yearlyExpense: Number(totals.yearlyExpense || 0),
      totalExpense: Number(totals.totalExpense || 0),
      monthlyRows,
    };
  }, [allExpenses?.summary, reportRows, summaryData?.data]);

  const columns: TableColumnsType<ExpenseRow> = [
    { title: t('title'), dataIndex: 'title', key: 'title', render: (value) => <strong>{value}</strong> },
    {
      title: t('amount'),
      dataIndex: 'amount',
      key: 'amount',
      align: 'center',
      render: (value) => <span className='expense-money'>{formatMoney(value)}</span>,
    },
    { title: t('date'), dataIndex: 'date', key: 'date', align: 'center' },
    { title: t('note'), dataIndex: 'note', key: 'note', render: (value) => value || '-' },
    {
      title: t('action'),
      key: 'action',
      align: 'center',
      render: (item) => (
        <Flex gap={6} className='table-actions expense-table-actions' justify='center'>
          <DeleteModal id={item.key} />
        </Flex>
      ),
      width: 90,
    },
  ];

  return (
    <div className='expense-page page-fade-in'>
      <div className='expense-page-header'>
        <div>
          <span>{t('expensePageSubtitle')}</span>
          <h1>{t('expenses')}</h1>
          <p>{t('expensePageDescription')}</p>
        </div>
        <WalletOutlined />
      </div>

      <Row gutter={[18, 18]}>
        <Col xs={24} xl={8}>
          <div className='expense-form-card'>
            <div className='expense-card-title'>
              <WalletOutlined />
              <div>
                <h2>{t('addExpense')}</h2>
                <p>{t('expenseFormSubtitle')}</p>
              </div>
            </div>
            <form className='expense-form' onSubmit={handleSubmit(onSubmit)}>
              <CustomInput name='title' label={t('title')} register={register} errors={errors} required />
              <CustomInput
                name='amount'
                label={t('amount')}
                type='number'
                register={register}
                errors={errors}
                required
                validation={{
                  validate: (value: string) => isValidLocalizedNumber(value, 0.01),
                }}
              />
              <CustomInput name='date' label={t('date')} type='date' register={register} errors={errors} required />
              <CustomInput name='note' label={t('note')} register={register} />
              <Button htmlType='submit' type='primary' className='btn-role-add' block loading={isCreating}>
                {t('submit')}
              </Button>
            </form>
          </div>
        </Col>

        <Col xs={24} xl={16}>
          <Row gutter={[14, 14]} className='expense-summary-row'>
            <Col xs={24} sm={12} xl={6}>
              <div className='expense-summary-card is-today'>
                <Statistic
                  title={t('todayExpenses')}
                  value={summary.todayExpense}
                  formatter={(value) => formatMoney(Number(value))}
                />
              </div>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <div className='expense-summary-card is-weekly'>
                <Statistic
                  title={t('weeklyExpenses')}
                  value={summary.weeklyExpense}
                  formatter={(value) => formatMoney(Number(value))}
                />
              </div>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <div className='expense-summary-card is-monthly'>
                <Statistic
                  title={t('monthlyExpenses')}
                  value={summary.monthlyExpense}
                  formatter={(value) => formatMoney(Number(value))}
                />
              </div>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <div className='expense-summary-card is-yearly'>
                <Statistic
                  title={t('yearlyExpenses')}
                  value={summary.yearlyExpense}
                  formatter={(value) => formatMoney(Number(value))}
                />
              </div>
            </Col>
          </Row>

          <Row gutter={[14, 14]} className='expense-chart-row'>
            <Col xs={24}>
              <div className='expense-chart-card'>
                <div className='expense-card-title is-compact'>
                  <CalendarOutlined />
                  <h3>{t('monthlyExpenses')}</h3>
                </div>
                <ResponsiveContainer width='100%' height={260}>
                  <BarChart data={summary.monthlyRows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='rgba(148, 163, 184, 0.35)' />
                    <XAxis dataKey='name' tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis tickFormatter={(value) => formatNumber(Number(value))} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => formatMoney(value)} />
                    <Bar dataKey='value' name={t('expenseAmount')} fill='#f59e0b' radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Col>
          </Row>
        </Col>
      </Row>

      <div className='expense-toolbar'>
        <Row gutter={[12, 12]} align='middle'>
          <Col xs={24} md={12}>
            <SearchInput
              placeholder={t('search')}
              setQuery={setQuery}
              value={searchInput}
              onChange={setSearchInput}
            />
          </Col>
          <Col xs={24} md={8}>
            <RangePicker
              key={rangePickerKey}
              size='large'
              className='expense-filter-control'
              onChange={(_, dateStrings) =>
                setDateRange({ start: dateStrings[0] || undefined, end: dateStrings[1] || undefined })
              }
            />
          </Col>
          <Col xs={24} md={4}>
            <Flex gap={8} className='expense-toolbar-actions'>
              <Button className='btn-role-neutral' onClick={clearFilters}>
                {t('clearFilters')}
              </Button>
            </Flex>
          </Col>
        </Row>
      </div>

      <div className='expense-table-card'>
        <Table
          size='middle'
          loading={isFetching || isSummaryFetching}
          columns={columns}
          dataSource={filteredTableData}
          pagination={false}
          scroll={{ x: 900 }}
        />
      </div>

      <Flex justify='center' className='expense-pagination'>
        <Pagination
          current={query.page}
          onChange={(page) => setQuery((prev) => ({ ...prev, page }))}
          defaultPageSize={query.limit}
          total={data?.meta?.total}
        />
      </Flex>
    </div>
  );
};

const DeleteModal = ({ id }: { id: string }) => {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteExpense, { isLoading }] = useDeleteExpenseMutation();

  const handleDelete = async () => {
    try {
      const res = await deleteExpense(id).unwrap();
      toastMessage({ icon: 'success', text: res.message });
      setIsModalOpen(false);
    } catch (error: any) {
      setIsModalOpen(false);
      toastMessage({ icon: 'error', text: error.data.message });
    }
  };

  return (
    <>
      <Button
        type='primary'
        size='middle'
        className='btn-role-delete'
        icon={<DeleteFilled />}
        onClick={() => setIsModalOpen(true)}
      />
      <Modal title={t('deleteTitle')} open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>{t('deleteQuestion')}</h2>
          <h4>{t('deleteWarning')}</h4>
          <Flex gap='1rem' justify='center' style={{ marginTop: '1rem' }}>
            <Button onClick={() => setIsModalOpen(false)} type='primary' className='btn-role-neutral'>
              {t('cancel')}
            </Button>
            <Button onClick={handleDelete} type='primary' className='btn-role-delete' loading={isLoading}>
              {t('confirmDelete')}
            </Button>
          </Flex>
        </div>
      </Modal>
    </>
  );
};

export default ExpenseManagementPage;
