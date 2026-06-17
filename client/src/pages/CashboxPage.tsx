import {
  ArrowDownOutlined,
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  SearchOutlined,
  UserOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Button,
  Col,
  DatePicker,
  Descriptions,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Statistic,
  Table,
  Tag,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { useMemo, useState } from 'react';
import {
  useCreatePersonAccountTransactionMutation,
  useDeleteCashboxPersonAccountMutation,
  useDeleteCashboxTransactionMutation,
  useGetCashboxPersonAccountQuery,
  useGetCashboxPersonAccountsQuery,
  useGetCashboxSummaryQuery,
  useGetCashboxTransactionsQuery,
  useUpdateCashboxPersonAccountMutation,
  useUpdateCashboxTransactionMutation,
} from '../redux/features/management/cashboxApi';
import { useLanguage } from '../i18n/LanguageContext';
import toastMessage from '../lib/toastMessage';
import formatDate from '../utils/formatDate';
import {
  formatCurrencyByLanguage,
  formatDateByLanguage,
  formatNumberByLanguage,
  getCurrencyAddonByLanguage,
} from '../utils/formatters';
import { inputNumberParser, isValidLocalizedNumber, normalizeNumberString, parseLocalizedNumber } from '../utils/numberNormalizer';
import { cashboxNoteLabel, cashboxReasonLabel, cashboxReferenceLabel } from '../utils/cashboxLabels';

type CashboxTransaction = {
  _id: string;
  type: string;
  transactionType?: string;
  direction: 'IN' | 'OUT';
  amount: number;
  balanceBefore?: number;
  balanceAfter?: number;
  referenceId?: string;
  relatedCashboxReference?: string;
  module?: string;
  personName?: string;
  sourceModule?: string;
  description?: string;
  reason?: string;
  notes?: string;
  actor?: string;
  performedBy?: string;
  createdAt?: string;
};

type CashboxTxQuery = {
  page: number;
  limit: number;
  search: string;
  direction?: 'IN' | 'OUT';
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

type PersonAccountTransaction = {
  _id: string;
  personName?: string;
  date?: string;
  transactionType: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  resultingBalance: number;
  reason?: string;
  notes?: string;
};

type PersonAccount = {
  _id: string;
  personAccountKey: string;
  personName: string;
  accountCreatedAt?: string;
  notes?: string;
  metadata?: string;
  totalDeposited: number;
  totalWithdrawn: number;
  currentNetBalance: number;
  transactions: PersonAccountTransaction[];
};

const chartColors = ['#16a34a', '#f59e0b', '#2563eb', '#0f766e', '#dc2626', '#38bdf8'];
const { RangePicker } = DatePicker;

const transactionTypeKeyMap: Record<string, 'txSale' | 'txExpense' | 'txSalary' | 'txTransfer' | 'txPurchasePayment' | 'txCustomerPayment' | 'txSellerPayment' | 'txSaleReturn' | 'txManual' | 'txDeposit' | 'txWithdrawal' | 'txMoneyTransfer' | 'txOperatorAccount' | 'txSaleIncome' | 'txDebtPayment' | 'txCompanyDebtPayment' | 'txSalaryPayment' | 'txPersonDeposit' | 'txPersonWithdrawal'> = {
  SALE: 'txSaleIncome',
  SALE_INCOME: 'txSaleIncome',
  EXPENSE: 'txExpense',
  SALARY: 'txSalaryPayment',
  SALARY_PAYMENT: 'txSalaryPayment',
  TRANSFER: 'txTransfer',
  PURCHASE_PAYMENT: 'txPurchasePayment',
  CUSTOMER_PAYMENT: 'txDebtPayment',
  DEBT_PAYMENT: 'txDebtPayment',
  SELLER_PAYMENT: 'txCompanyDebtPayment',
  COMPANY_DEBT_PAYMENT: 'txCompanyDebtPayment',
  SALE_RETURN: 'txSaleReturn',
  MANUAL: 'txManual',
  DEPOSIT: 'txPersonDeposit',
  WITHDRAWAL: 'txPersonWithdrawal',
  PERSON_DEPOSIT: 'txPersonDeposit',
  PERSON_WITHDRAWAL: 'txPersonWithdrawal',
  MONEY_TRANSFER: 'txMoneyTransfer',
  OPERATOR_ACCOUNT: 'txOperatorAccount',
};

const personAccountApiMessageKeys = {
  'Person account transaction recorded successfully!': 'personAccountTransactionSuccess',
  'Cashbox transaction created successfully!': 'personAccountTransactionSuccess',
  'Person name is required': 'personNameRequired',
  'Withdrawal cannot exceed person account balance': 'withdrawalExceedsBalance',
  'Person account not found': 'personAccountNotFound',
  'Person account with this name already exists': 'personAccountNameExists',
  'Person account updated successfully!': 'personAccountUpdated',
  'Person account deleted successfully!': 'personAccountDeleted',
  'Amount must be greater than zero': 'amountMin',
} as const;

const formatDateTime = (date: string | undefined, language: ReturnType<typeof useLanguage>['language']) => {
  if (!date) return '-';
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return date;
  return formatDateByLanguage(value, language, { dateStyle: 'medium', timeStyle: 'short' });
};

const CashboxPage = () => {
  const { t, language } = useLanguage();
  const tr = (key: string) => t(key as Parameters<typeof t>[0]);
  const formatNumber = (value: number) => formatNumberByLanguage(value, language);
  const formatMoney = (value: number) => formatCurrencyByLanguage(value, language);
  const emptyValue = t('notAvailable');
  const transactionTypeLabel = (value: string) => {
    const key = transactionTypeKeyMap[value];
    return key ? t(key) : value || emptyValue;
  };

  const { data: summary, refetch: refetchSummary } = useGetCashboxSummaryQuery(undefined);
  const [txQuery, setTxQuery] = useState<CashboxTxQuery>({ page: 1, limit: 10, search: '' });
  const [txSearchInput, setTxSearchInput] = useState('');
  const [txDirectionFilter, setTxDirectionFilter] = useState<'IN' | 'OUT' | ''>('');
  const [txRangePickerKey, setTxRangePickerKey] = useState(0);
  const [selectedTx, setSelectedTx] = useState<CashboxTransaction | null>(null);
  const [viewTxOpen, setViewTxOpen] = useState(false);
  const [editTxOpen, setEditTxOpen] = useState(false);
  const [editTxForm] = Form.useForm();

  const { data: transactions, isFetching, refetch: refetchTransactions } = useGetCashboxTransactionsQuery({
    page: txQuery.page,
    limit: txQuery.limit,
    search: txQuery.search || undefined,
    direction: txQuery.direction,
    startDate: txQuery.startDate,
    endDate: txQuery.endDate,
    sortBy: txQuery.sortBy,
    sortOrder: txQuery.sortOrder,
  });
  const { data: allTransactions } = useGetCashboxTransactionsQuery({ limit: 500 });
  const [updateCashboxTx, { isLoading: isUpdatingTx }] = useUpdateCashboxTransactionMutation();
  const [deleteCashboxTx] = useDeleteCashboxTransactionMutation();

  const [personSearchInput, setPersonSearchInput] = useState('');
  const [personSearch, setPersonSearch] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<PersonAccount | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editAccountOpen, setEditAccountOpen] = useState(false);
  const [personForm] = Form.useForm();
  const [editAccountForm] = Form.useForm();

  const { data: personAccountsData, isFetching: isPersonAccountsLoading, refetch: refetchPersonAccounts } =
    useGetCashboxPersonAccountsQuery({ search: personSearch });
  const [createPersonTransaction, { isLoading: isSavingPersonTx }] = useCreatePersonAccountTransactionMutation();
  const [updatePersonAccount, { isLoading: isUpdatingPersonAccount }] = useUpdateCashboxPersonAccountMutation();
  const [deletePersonAccount] = useDeleteCashboxPersonAccountMutation();
  const { data: accountDetailData, isFetching: isAccountDetailLoading } = useGetCashboxPersonAccountQuery(
    selectedAccount?._id || '',
    { skip: !detailsOpen || !selectedAccount?._id },
  );

  const personAccountRows: PersonAccount[] = personAccountsData?.data || [];
  const detailAccount = accountDetailData?.data || selectedAccount;

  const personSummary = useMemo(
    () =>
      personAccountRows.reduce(
        (acc, row) => ({
          accounts: acc.accounts + 1,
          deposited: acc.deposited + Number(row.totalDeposited || 0),
          withdrawn: acc.withdrawn + Number(row.totalWithdrawn || 0),
          balance: acc.balance + Number(row.currentNetBalance || 0),
        }),
        { accounts: 0, deposited: 0, withdrawn: 0, balance: 0 },
      ),
    [personAccountRows],
  );

  const translatePersonAccountMessage = (message?: string) => {
    if (!message) return t('personAccountTransactionFailed');
    const key = personAccountApiMessageKeys[message as keyof typeof personAccountApiMessageKeys];
    return key ? t(key) : message;
  };

  const formatTime = (date?: string) => {
    if (!date) return emptyValue;
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return emptyValue;
    return formatDateByLanguage(value, language, { timeStyle: 'short' });
  };

  const openAccountDetails = (account: PersonAccount) => {
    setSelectedAccount(account);
    setDetailsOpen(true);
  };

  const openEditAccount = (account: PersonAccount) => {
    setSelectedAccount(account);
    editAccountForm.setFieldsValue({
      personName: account.personName,
      notes: account.notes || '',
      metadata: account.metadata || '',
    });
    setEditAccountOpen(true);
  };

  const submitEditAccount = async (values: { personName: string; notes?: string; metadata?: string }) => {
    if (!selectedAccount?._id) return;
    try {
      const res = await updatePersonAccount({
        id: selectedAccount._id,
        personName: values.personName.trim(),
        notes: values.notes?.trim(),
        metadata: values.metadata?.trim(),
      }).unwrap();
      toastMessage({ icon: 'success', title: t('alertSuccessTitle'), text: translatePersonAccountMessage(res.message), confirmButtonText: t('alertOk') });
      setEditAccountOpen(false);
      if (detailsOpen && res.data) setSelectedAccount(res.data);
      refetchPersonAccounts();
      refetchTransactions();
    } catch (error: any) {
      toastMessage({ icon: 'error', title: t('alertErrorTitle'), text: translatePersonAccountMessage(error?.data?.message), confirmButtonText: t('alertOk') });
    }
  };

  const confirmDeleteAccount = async (account: PersonAccount) => {
    const result = await toastMessage({
      icon: 'warning',
      title: t('deletePersonAccountTitle'),
      text: `${t('deletePersonAccountQuestion')} ${t('deleteWarning')}`,
      showCancelButton: true,
      confirmButtonText: t('confirm'),
      cancelButtonText: t('cancel'),
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      const res = await deletePersonAccount(account._id).unwrap();
      toastMessage({ icon: 'success', title: t('alertSuccessTitle'), text: translatePersonAccountMessage(res.message), confirmButtonText: t('alertOk') });
      if (selectedAccount?._id === account._id) {
        setSelectedAccount(null);
        setDetailsOpen(false);
        setEditAccountOpen(false);
      }
      refetchPersonAccounts();
      refetchSummary();
      refetchTransactions();
    } catch (error: any) {
      toastMessage({ icon: 'error', title: t('alertErrorTitle'), text: translatePersonAccountMessage(error?.data?.message), confirmButtonText: t('alertOk') });
    }
  };

  const submitPersonTransaction = async (values: {
    personName: string;
    transactionType: 'DEPOSIT' | 'WITHDRAWAL';
    amount: string;
    reason?: string;
    note?: string;
  }) => {
    try {
      const res = await createPersonTransaction({
        transactionType: values.transactionType,
        amount: parseLocalizedNumber(values.amount),
        personName: values.personName.trim(),
        reason: values.reason?.trim(),
        notes: values.note?.trim(),
      }).unwrap();
      toastMessage({ icon: 'success', title: t('alertSuccessTitle'), text: translatePersonAccountMessage(res.message), confirmButtonText: t('alertOk') });
      personForm.resetFields(['amount', 'reason', 'note']);
      refetchPersonAccounts();
      refetchSummary();
      refetchTransactions();
      if (detailsOpen && selectedAccount && res.data) {
        const sameAccount =
          res.data._id === selectedAccount._id ||
          res.data.personAccountKey?.toLowerCase() === selectedAccount.personAccountKey?.toLowerCase();
        if (sameAccount) setSelectedAccount(res.data);
      }
    } catch (error: any) {
      toastMessage({ icon: 'error', title: t('alertErrorTitle'), text: translatePersonAccountMessage(error?.data?.message), confirmButtonText: t('alertOk') });
    }
  };

  const transactionRows: CashboxTransaction[] = transactions?.data || [];
  const chartTransactionRows: CashboxTransaction[] = allTransactions?.data || [];
  const todayCashIn = Number(summary?.data?.todayCashIn || 0);
  const todayCashOut = Number(summary?.data?.todayCashOut || 0);

  const openViewTransaction = (row: CashboxTransaction) => {
    setSelectedTx(row);
    setViewTxOpen(true);
  };

  const openEditTransaction = (row: CashboxTransaction) => {
    setSelectedTx(row);
    editTxForm.setFieldsValue({
      amount: String(row.amount ?? ''),
      reason: row.reason || '',
      note: row.notes || row.description || '',
      reference: row.referenceId || row.relatedCashboxReference || '',
    });
    setEditTxOpen(true);
  };

  const submitEditTransaction = async (values: {
    amount: string;
    reason?: string;
    note?: string;
    reference?: string;
  }) => {
    if (!selectedTx?._id) return;
    try {
      const res = await updateCashboxTx({
        id: selectedTx._id,
        amount: parseLocalizedNumber(values.amount),
        reason: values.reason?.trim(),
        notes: values.note?.trim(),
        reference: values.reference?.trim(),
      }).unwrap();
      toastMessage({ icon: 'success', title: t('alertSuccessTitle'), text: res.message || t('cashboxTransactionUpdated'), confirmButtonText: t('alertOk') });
      setEditTxOpen(false);
      setSelectedTx(null);
      refetchSummary();
      refetchTransactions();
    } catch (error: any) {
      toastMessage({ icon: 'error', title: t('alertErrorTitle'), text: error?.data?.message || t('cashboxTransactionFailed'), confirmButtonText: t('alertOk') });
    }
  };

  const confirmDeleteTransaction = async (row: CashboxTransaction) => {
    const result = await toastMessage({
      icon: 'warning',
      title: t('deleteCashboxTransactionTitle'),
      text: `${t('deleteCashboxTransactionQuestion')} ${t('deleteWarning')}`,
      showCancelButton: true,
      confirmButtonText: t('confirmDelete'),
      cancelButtonText: t('cancel'),
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      const res = await deleteCashboxTx(row._id).unwrap();
      toastMessage({ icon: 'success', title: t('alertSuccessTitle'), text: res.message || t('cashboxTransactionDeleted'), confirmButtonText: t('alertOk') });
      refetchSummary();
      refetchTransactions();
    } catch (error: any) {
      toastMessage({ icon: 'error', title: t('alertErrorTitle'), text: error?.data?.message || t('cashboxTransactionFailed'), confirmButtonText: t('alertOk') });
    }
  };

  const clearTxFilters = () => {
    setTxSearchInput('');
    setTxDirectionFilter('');
    setTxRangePickerKey((prev) => prev + 1);
    setTxQuery({ page: 1, limit: 10, search: '' });
  };

  const sourceChartData = Object.values(
    chartTransactionRows.reduce<Record<string, { name: string; value: number }>>((acc, row) => {
      const source = cashboxReferenceLabel(row, tr);
      if (!acc[source]) acc[source] = { name: source, value: 0 };
      acc[source].value += Number(row.amount || 0);
      return acc;
    }, {}),
  ).slice(0, 8);

  const columns: TableColumnsType<CashboxTransaction> = [
    {
      title: t('dateTime'),
      key: 'createdAt',
      sorter: true,
      render: (_: unknown, row: CashboxTransaction) => formatDateTime(row.createdAt, language),
    },
    {
      title: t('direction'),
      dataIndex: 'direction',
      key: 'direction',
      align: 'center',
      sorter: true,
      render: (value: 'IN' | 'OUT') => (
        <Tag color={value === 'IN' ? 'success' : 'warning'} className='cashbox-direction-tag'>
          {value === 'IN' ? t('cashIn') : t('cashOut')}
        </Tag>
      ),
    },
    {
      title: t('amount'),
      dataIndex: 'amount',
      key: 'amount',
      align: 'center',
      sorter: true,
      render: (value: number) => <span className='cashbox-money'>{formatMoney(value)}</span>,
    },
    {
      title: t('type'),
      dataIndex: 'type',
      key: 'type',
      render: (value: string, row: CashboxTransaction) => <Tag color='blue'>{transactionTypeLabel(row.transactionType || value)}</Tag>,
    },
    {
      title: t('reason'),
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (_: string, row: CashboxTransaction) => cashboxReasonLabel(row, tr),
    },
    {
      title: t('note'),
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (_: string, row: CashboxTransaction) => cashboxNoteLabel(row, tr),
    },
    {
      title: t('reference'),
      key: 'reference',
      ellipsis: true,
      render: (_: unknown, row: CashboxTransaction) => cashboxReferenceLabel(row, tr),
    },
    {
      title: t('balanceBefore'),
      dataIndex: 'balanceBefore',
      key: 'balanceBefore',
      align: 'center',
      render: (value: number | undefined) => <span className='cashbox-money'>{formatMoney(Number(value || 0))}</span>,
    },
    {
      title: t('balanceAfter'),
      dataIndex: 'balanceAfter',
      key: 'balanceAfter',
      align: 'center',
      render: (value: number | undefined) => <span className='cashbox-money'>{formatMoney(Number(value || 0))}</span>,
    },
    {
      title: t('action'),
      key: 'action',
      align: 'center',
      fixed: 'right',
      width: 300,
      render: (_: unknown, row: CashboxTransaction) => (
        <div className='cashbox-tx-actions'>
          <Button type='primary' size='small' icon={<EyeOutlined />} className='btn-role-view cashbox-tx-btn' onClick={() => openViewTransaction(row)}>
            {t('view')}
          </Button>
          <Button size='small' icon={<EditOutlined />} className='cashbox-tx-btn cashbox-tx-btn-edit' onClick={() => openEditTransaction(row)}>
            {t('update')}
          </Button>
          <Button size='small' icon={<DeleteOutlined />} className='btn-role-delete cashbox-tx-btn' onClick={() => confirmDeleteTransaction(row)}>
            {t('delete')}
          </Button>
        </div>
      ),
    },
  ];

  const personAccountColumns: TableColumnsType<PersonAccount> = [
    {
      title: t('personName'),
      dataIndex: 'personName',
      key: 'personName',
      render: (value: string) => <strong>{value}</strong>,
    },
    {
      title: t('accountCreationDate'),
      dataIndex: 'accountCreatedAt',
      key: 'accountCreatedAt',
      align: 'center',
      render: (value?: string) => (value ? formatDate(value, language) : emptyValue),
    },
    {
      title: t('totalDeposited'),
      dataIndex: 'totalDeposited',
      key: 'totalDeposited',
      align: 'center',
      render: (value: number) => <span className='cashbox-money'>{formatMoney(Number(value || 0))}</span>,
    },
    {
      title: t('totalWithdrawn'),
      dataIndex: 'totalWithdrawn',
      key: 'totalWithdrawn',
      align: 'center',
      render: (value: number) => <span className='cashbox-money'>{formatMoney(Number(value || 0))}</span>,
    },
    {
      title: t('currentNetBalance'),
      dataIndex: 'currentNetBalance',
      key: 'currentNetBalance',
      align: 'center',
      render: (value: number) => (
        <Tag color={Number(value || 0) >= 0 ? 'success' : 'error'}>{formatMoney(Number(value || 0))}</Tag>
      ),
    },
    {
      title: t('action'),
      key: 'action',
      align: 'center',
      fixed: 'right',
      width: 280,
      render: (_, row) => (
        <div className='person-account-actions' onClick={(event) => event.stopPropagation()}>
          <Button type='primary' size='small' icon={<EyeOutlined />} className='btn-role-view person-account-btn' onClick={() => openAccountDetails(row)}>
            {t('view')}
          </Button>
          <Button size='small' icon={<EditOutlined />} className='person-account-btn person-account-btn-edit' onClick={() => openEditAccount(row)}>
            {t('edit')}
          </Button>
          <Button size='small' icon={<DeleteOutlined />} className='btn-role-delete person-account-btn' onClick={() => confirmDeleteAccount(row)}>
            {t('delete')}
          </Button>
        </div>
      ),
    },
  ];

  const personTransactionColumns: TableColumnsType<PersonAccountTransaction> = [
    {
      title: t('personName'),
      dataIndex: 'personName',
      key: 'personName',
      render: (value: string) => value || detailAccount?.personName || emptyValue,
    },
    {
      title: t('date'),
      key: 'date',
      render: (_, row) => (row.date ? formatDate(row.date, language) : emptyValue),
    },
    {
      title: t('time'),
      key: 'time',
      render: (_, row) => formatTime(row.date),
    },
    {
      title: t('amount'),
      dataIndex: 'amount',
      key: 'amount',
      align: 'center',
      render: (value: number) => <span className='cashbox-money'>{formatMoney(Number(value || 0))}</span>,
    },
    {
      title: t('transactionType'),
      dataIndex: 'transactionType',
      key: 'transactionType',
      render: (value: 'DEPOSIT' | 'WITHDRAWAL') => (
        <Tag color={value === 'DEPOSIT' ? 'success' : 'warning'}>
          {value === 'DEPOSIT' ? t('deposit') : t('withdrawal')}
        </Tag>
      ),
    },
    {
      title: t('resultingBalance'),
      dataIndex: 'resultingBalance',
      key: 'resultingBalance',
      align: 'center',
      render: (value: number) => (
        <Tag color={Number(value || 0) >= 0 ? 'success' : 'error'}>{formatMoney(Number(value || 0))}</Tag>
      ),
    },
    {
      title: t('reason'),
      dataIndex: 'reason',
      key: 'reason',
      render: (value: string) => value || emptyValue,
    },
    {
      title: t('note'),
      dataIndex: 'notes',
      key: 'notes',
      render: (value: string) => value || emptyValue,
    },
  ];

  return (
    <div className='cashbox-page page-fade-in'>
      <div className='cashbox-page-header'>
        <div>
          <span>{t('cashboxPageSubtitle')}</span>
          <h1>{t('cashbox')}</h1>
          <p>{t('cashboxPageDescription')}</p>
        </div>
        <WalletOutlined />
      </div>

      <Row gutter={[14, 14]} className='cashbox-summary-row'>
        <Col xs={24} md={12} xl={6}>
          <div className='cashbox-summary-card is-balance'>
            <Statistic title={t('currentCashBalance')} value={formatMoney(summary?.data?.balance || 0)} />
          </div>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <div className='cashbox-summary-card is-in'>
            <Statistic title={t('todayCashIn')} value={formatMoney(todayCashIn)} />
          </div>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <div className='cashbox-summary-card is-out'>
            <Statistic title={t('todayCashOut')} value={formatMoney(todayCashOut)} />
          </div>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <div className='cashbox-summary-card is-transfer'>
            <Statistic title={t('personAccounts')} value={formatNumberByLanguage(personSummary.accounts, language)} />
          </div>
        </Col>
      </Row>

      <div className='cashbox-form-card person-account-form-card'>
        <div className='cashbox-card-title'>
          <UserOutlined />
          <div>
            <h2>{t('recordPersonTransaction')}</h2>
            <p>{t('personAccountHelp')}</p>
          </div>
        </div>
        <Form form={personForm} layout='vertical' initialValues={{ transactionType: 'DEPOSIT' }} onFinish={submitPersonTransaction}>
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12} xl={6}>
              <Form.Item name='personName' label={t('personName')} rules={[{ required: true, message: t('personNameRequired') }]}>
                <Input placeholder={t('personName')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Form.Item name='transactionType' label={t('transactionType')} rules={[{ required: true, message: t('transactionType') }]}>
                <Select
                  options={[
                    { value: 'DEPOSIT', label: t('deposit') },
                    { value: 'WITHDRAWAL', label: t('withdrawal') },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Form.Item
                name='amount'
                label={t('amount')}
                normalize={normalizeNumberString}
                rules={[
                  { required: true, message: t('amountRequired') },
                  {
                    validator: (_, value) =>
                      isValidLocalizedNumber(value, 0.01) ? Promise.resolve() : Promise.reject(new Error(t('amountMin'))),
                  },
                ]}
              >
                <InputNumber min={0.01} parser={inputNumberParser} style={{ width: '100%' }} addonAfter={getCurrencyAddonByLanguage(language)} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Form.Item name='reason' label={t('reason')}>
                <Input placeholder={t('reasonOptional')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={18}>
              <Form.Item name='note' label={t('note')}>
                <Input.TextArea rows={2} placeholder={t('noteOptional')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6} className='person-account-form-action'>
              <Form.Item label=' '>
                <Button type='primary' htmlType='submit' className='btn-role-add' block loading={isSavingPersonTx}>
                  {t('submit')}
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </div>

      <div className='cashbox-table-card cashbox-person-accounts-card'>
        <Flex className='secondary-page-table-toolbar' justify='space-between' align='center' wrap='wrap' gap={12}>
          <div>
            <h2>{t('personAccounts')}</h2>
            <p>{t('accountHistory')}</p>
          </div>
          <Input
            allowClear
            size='large'
            prefix={<SearchOutlined />}
            placeholder={t('searchPersonAccounts')}
            value={personSearchInput}
            onChange={(event) => {
              const value = event.target.value;
              setPersonSearchInput(value);
              setPersonSearch(value.trim());
            }}
            style={{ maxWidth: 360 }}
          />
        </Flex>
        <Table
          loading={isPersonAccountsLoading}
          columns={personAccountColumns}
          dataSource={personAccountRows}
          rowKey='_id'
          scroll={{ x: 980 }}
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: t('noPersonAccounts') }}
          onRow={(record) => ({
            onClick: () => openAccountDetails(record),
            style: { cursor: 'pointer' },
          })}
        />
      </div>

      <div className='cashbox-chart-card'>
        <div className='cashbox-card-title is-compact'>
          <ArrowDownOutlined />
          <h3>{t('sourceModule')}</h3>
        </div>
        <ResponsiveContainer width='100%' height={280}>
          <BarChart data={sourceChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='rgba(148, 163, 184, 0.35)' />
            <XAxis dataKey='name' tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis tickFormatter={(value) => formatNumber(Number(value))} tick={{ fill: '#64748b', fontSize: 12 }} />
            <Tooltip formatter={(value: number) => formatMoney(value)} />
            <Bar dataKey='value' name={t('amount')} fill='#0f766e' radius={[8, 8, 0, 0]}>
              {sourceChartData.map((entry, index) => (
                <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className='cashbox-table-card cashbox-tx-table-card'>
        <Flex className='secondary-page-table-toolbar' justify='space-between' align='center' wrap='wrap' gap={12}>
          <div>
            <h2>{t('cashbox')}</h2>
            <p>{t('cashboxPageDescription')}</p>
          </div>
          <Flex gap={10} wrap='wrap' className='cashbox-tx-filters'>
            <Input
              allowClear
              size='large'
              prefix={<SearchOutlined />}
              placeholder={t('search')}
              value={txSearchInput}
              onChange={(event) => {
                const value = event.target.value;
                setTxSearchInput(value);
                setTxQuery((prev) => ({ ...prev, page: 1, search: value.trim() }));
              }}
              style={{ maxWidth: 280 }}
            />
            <Select
              allowClear
              placeholder={t('direction')}
              value={txDirectionFilter || undefined}
              style={{ minWidth: 140 }}
              onChange={(value) => {
                const direction = (value || '') as 'IN' | 'OUT' | '';
                setTxDirectionFilter(direction);
                setTxQuery((prev) => ({
                  ...prev,
                  page: 1,
                  direction: direction || undefined,
                }));
              }}
              options={[
                { value: 'IN', label: t('cashIn') },
                { value: 'OUT', label: t('cashOut') },
              ]}
            />
            <RangePicker
              key={txRangePickerKey}
              suffixIcon={<CalendarOutlined />}
              onChange={(_, dateStrings) => {
                setTxQuery((prev) => ({
                  ...prev,
                  page: 1,
                  startDate: dateStrings[0] || undefined,
                  endDate: dateStrings[1] || undefined,
                }));
              }}
            />
            <Button onClick={clearTxFilters}>{t('clearFilters')}</Button>
          </Flex>
        </Flex>
        <Table
          loading={isFetching}
          columns={columns}
          dataSource={transactionRows}
          rowKey='_id'
          scroll={{ x: 1200 }}
          onChange={(_, __, sorter) => {
            const activeSorter = Array.isArray(sorter) ? sorter[0] : sorter;
            if (!activeSorter || !activeSorter.order) {
              setTxQuery((prev) => ({ ...prev, sortBy: undefined, sortOrder: undefined }));
              return;
            }
            const sortFieldMap: Record<string, string> = {
              createdAt: 'createdAt',
              direction: 'direction',
              amount: 'amount',
            };
            const columnKey = String(activeSorter.columnKey || '');
            setTxQuery((prev) => ({
              ...prev,
              page: 1,
              sortBy: sortFieldMap[columnKey] || 'createdAt',
              sortOrder: activeSorter.order === 'ascend' ? 'asc' : 'desc',
            }));
          }}
          pagination={{
            current: txQuery.page,
            pageSize: txQuery.limit,
            total: transactions?.meta?.total || transactionRows.length,
            showSizeChanger: true,
            onChange: (page, pageSize) => setTxQuery((prev) => ({ ...prev, page, limit: pageSize || prev.limit })),
          }}
        />
      </div>

      <Modal
        title={t('cashboxTransactionDetails')}
        open={viewTxOpen}
        onCancel={() => setViewTxOpen(false)}
        footer={null}
        width={720}
        destroyOnClose
      >
        {selectedTx ? (
          <Descriptions bordered size='small' column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label={t('dateTime')}>{formatDateTime(selectedTx.createdAt, language)}</Descriptions.Item>
            <Descriptions.Item label={t('direction')}>
              <Tag color={selectedTx.direction === 'IN' ? 'success' : 'warning'}>
                {selectedTx.direction === 'IN' ? t('cashIn') : t('cashOut')}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('amount')}>{formatMoney(Number(selectedTx.amount || 0))}</Descriptions.Item>
            <Descriptions.Item label={t('type')}>{transactionTypeLabel(selectedTx.transactionType || selectedTx.type)}</Descriptions.Item>
            <Descriptions.Item label={t('reason')}>{cashboxReasonLabel(selectedTx, tr)}</Descriptions.Item>
            <Descriptions.Item label={t('note')}>{cashboxNoteLabel(selectedTx, tr)}</Descriptions.Item>
            <Descriptions.Item label={t('reference')} span={2}>
              {cashboxReferenceLabel(selectedTx, tr)}
            </Descriptions.Item>
            <Descriptions.Item label={t('balanceBefore')}>{formatMoney(Number(selectedTx.balanceBefore || 0))}</Descriptions.Item>
            <Descriptions.Item label={t('balanceAfter')}>{formatMoney(Number(selectedTx.balanceAfter || 0))}</Descriptions.Item>
            <Descriptions.Item label={t('performedBy')}>{selectedTx.actor || selectedTx.performedBy || emptyValue}</Descriptions.Item>
            <Descriptions.Item label={t('module')}>{transactionTypeLabel(selectedTx.module || selectedTx.sourceModule || t('other'))}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>

      <Modal
        title={t('editCashboxTransaction')}
        open={editTxOpen}
        onCancel={() => setEditTxOpen(false)}
        onOk={() => editTxForm.submit()}
        okText={t('update')}
        cancelText={t('cancel')}
        confirmLoading={isUpdatingTx}
        width={640}
        destroyOnClose
      >
        <Form form={editTxForm} layout='vertical' onFinish={submitEditTransaction}>
          <Form.Item
            name='amount'
            label={t('amount')}
            normalize={normalizeNumberString}
            rules={[
              { required: true, message: t('amountRequired') },
              {
                validator: (_, value) =>
                  isValidLocalizedNumber(value, 0.01) ? Promise.resolve() : Promise.reject(new Error(t('amountMin'))),
              },
            ]}
          >
            <InputNumber min={0.01} parser={inputNumberParser} style={{ width: '100%' }} addonAfter={getCurrencyAddonByLanguage(language)} />
          </Form.Item>
          <Form.Item name='reason' label={t('reason')}>
            <Input placeholder={t('reasonOptional')} />
          </Form.Item>
          <Form.Item name='note' label={t('note')}>
            <Input.TextArea rows={3} placeholder={t('noteOptional')} />
          </Form.Item>
          <Form.Item name='reference' label={t('reference')}>
            <Input placeholder={t('reference')} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('editPersonAccount')}
        open={editAccountOpen}
        onCancel={() => setEditAccountOpen(false)}
        onOk={() => editAccountForm.submit()}
        okText={t('confirm')}
        cancelText={t('cancel')}
        confirmLoading={isUpdatingPersonAccount}
        width={640}
        destroyOnClose
      >
        <Form form={editAccountForm} layout='vertical' onFinish={submitEditAccount}>
          <Form.Item name='personName' label={t('personName')} rules={[{ required: true, message: t('personNameRequired') }]}>
            <Input placeholder={t('personName')} />
          </Form.Item>
          <Form.Item name='notes' label={t('note')}>
            <Input.TextArea rows={3} placeholder={t('noteOptional')} />
          </Form.Item>
          <Form.Item name='metadata' label={t('accountMetadata')}>
            <Input.TextArea rows={2} placeholder={t('accountMetadataOptional')} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('personAccountDetails')}
        open={detailsOpen}
        onCancel={() => setDetailsOpen(false)}
        footer={null}
        width={960}
        destroyOnClose
      >
        {detailAccount ? (
          <>
            <Descriptions bordered size='small' column={{ xs: 1, sm: 2 }} className='person-account-detail-summary'>
              <Descriptions.Item label={t('personName')}>{detailAccount.personName}</Descriptions.Item>
              <Descriptions.Item label={t('accountCreationDate')}>
                {detailAccount.accountCreatedAt ? formatDate(detailAccount.accountCreatedAt, language) : emptyValue}
              </Descriptions.Item>
              <Descriptions.Item label={t('totalDeposited')}>{formatMoney(detailAccount.totalDeposited)}</Descriptions.Item>
              <Descriptions.Item label={t('totalWithdrawn')}>{formatMoney(detailAccount.totalWithdrawn)}</Descriptions.Item>
              <Descriptions.Item label={t('currentNetBalance')} span={2}>
                <Tag color={detailAccount.currentNetBalance >= 0 ? 'success' : 'error'}>
                  {formatMoney(detailAccount.currentNetBalance)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('note')} span={2}>
                {detailAccount.notes || emptyValue}
              </Descriptions.Item>
              <Descriptions.Item label={t('accountMetadata')} span={2}>
                {detailAccount.metadata || emptyValue}
              </Descriptions.Item>
            </Descriptions>
            <h3 className='person-account-detail-history-title'>{t('accountHistory')}</h3>
            <Table
              loading={isAccountDetailLoading}
              columns={personTransactionColumns}
              dataSource={detailAccount.transactions}
              rowKey='_id'
              pagination={{ pageSize: 8 }}
              scroll={{ x: 980 }}
              locale={{ emptyText: t('noPersonAccounts') }}
            />
          </>
        ) : null}
      </Modal>
    </div>
  );
};

export default CashboxPage;
