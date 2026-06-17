import { CheckCircleOutlined, EyeOutlined, FileTextOutlined, SearchOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Col, DatePicker, Descriptions, Flex, Form, Input, InputNumber, Modal, Popconfirm, Row, Segmented, Statistic, Table, Tag } from 'antd';
import type { TableColumnsType } from 'antd';
import { useMemo, useState } from 'react';
import {
  useAddCustomerDebtMutation,
  useGetCustomerDebtorAccountsQuery,
  useGetCustomerDebtorSummaryQuery,
  useRecordCustomerDebtorPaymentMutation,
  useSettleCustomerDebtorAccountMutation,
} from '../redux/features/management/customerApi';
import { useLanguage } from '../i18n/LanguageContext';
import formatDate from '../utils/formatDate';
import { formatCurrencyByLanguage, formatNumberByLanguage, getCurrencyAddonByLanguage } from '../utils/formatters';
import { inputNumberParser, isValidLocalizedNumber, normalizeNumberString, parseLocalizedNumber } from '../utils/numberNormalizer';
import toastMessage from '../lib/toastMessage';

type DebtEntry = {
  _id: string;
  date?: string;
  amount: number;
  reason: string;
  notes?: string;
  medicinesTaken?: string;
  createdAt?: string;
};

type PaymentEntry = {
  _id: string;
  date?: string;
  amount: number;
  note?: string;
  createdAt?: string;
};

type DebtorAccount = {
  _id: string;
  customerName: string;
  accountKey: string;
  status: 'ACTIVE' | 'SETTLED';
  accountNotes?: string;
  accountCreatedAt?: string;
  totalDebt: number;
  totalPayments: number;
  currentDebt: number;
  debtEntries: DebtEntry[];
  paymentEntries: PaymentEntry[];
  settledAt?: string;
  settlementTotalDebt?: number;
  settlementReasonSummary?: string;
  lastDebtDate?: string;
};

type DebtorStatusFilter = 'active' | 'settled';

const debtorApiMessageKeys = {
  'Customer debt recorded successfully!': 'customerDebtRecordedSuccess',
  'Customer payment recorded successfully!': 'customerPaymentSuccess',
  'Customer payment recorded and account settled successfully!': 'customerDebtorPaymentSettledSuccess',
  'Debtor account settled successfully!': 'debtorAccountSettledSuccess',
  'Customer name is required': 'customerNameRequired',
  'Debt reason is required': 'debtReasonRequired',
  'Amount must be greater than zero': 'amountMin',
  'Active debtor account is not found!': 'debtorAccountNotFound',
  'Account has no debt to settle': 'noDebtToSettle',
  'Payment cannot exceed customer debt': 'customerPaymentExceedsDebt',
} as const;

const CustomerDebtorsPage = () => {
  const { t, language } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<DebtorStatusFilter>('active');
  const [query, setQuery] = useState({ page: 1, limit: 10, search: '', status: 'active' as DebtorStatusFilter });
  const [selectedAccount, setSelectedAccount] = useState<DebtorAccount | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [form] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const { data, isFetching, refetch } = useGetCustomerDebtorAccountsQuery(query);
  const { data: summaryData } = useGetCustomerDebtorSummaryQuery({ status: statusFilter });
  const [addDebt, { isLoading: isSaving }] = useAddCustomerDebtMutation();
  const [recordPayment, { isLoading: isPaying }] = useRecordCustomerDebtorPaymentMutation();
  const [settleAccount, { isLoading: isSettling }] = useSettleCustomerDebtorAccountMutation();

  const rows: DebtorAccount[] = data?.data || [];
  const emptyValue = t('notAvailable');

  const summary = useMemo(() => {
    const totals = summaryData?.data || data?.summary || {};
    return {
      customers: Number(totals.customers || 0),
      debt: Number(totals.totalDebt || 0),
      payments: Number(totals.totalPayments || 0),
    };
  }, [data?.summary, summaryData?.data]);

  const money = (value: number) => formatCurrencyByLanguage(value, language);

  const translateDebtorMessage = (message?: string) => {
    if (!message) return t('failed');
    const key = debtorApiMessageKeys[message as keyof typeof debtorApiMessageKeys];
    return key ? t(key) : message;
  };

  const openAccountDetails = (account: DebtorAccount) => {
    setSelectedAccount(account);
    setDetailsOpen(true);
  };

  const submitDebt = async (values: {
    customerName: string;
    date: { toISOString?: () => string } | string;
    amount: string;
    reason: string;
    medicinesTaken?: string;
    notes?: string;
  }) => {
    try {
      const res = await addDebt({
        customerName: values.customerName.trim(),
        date: typeof values.date === 'object' && values.date?.toISOString ? values.date.toISOString() : values.date,
        amount: parseLocalizedNumber(values.amount),
        reason: values.reason.trim(),
        medicinesTaken: values.medicinesTaken?.trim(),
        notes: values.notes?.trim(),
      }).unwrap();
      toastMessage({ icon: 'success', text: translateDebtorMessage(res.message) });
      form.resetFields(['amount', 'reason', 'notes']);
      refetch();
      if (detailsOpen && selectedAccount && res.data?.customerName?.toLowerCase() === selectedAccount.customerName.toLowerCase()) {
        setSelectedAccount(res.data);
      }
    } catch (error: any) {
      toastMessage({ icon: 'error', text: translateDebtorMessage(error?.data?.message) });
    }
  };

  const submitPayment = async (values: { amount: string; date: { toISOString?: () => string } | string; note?: string }) => {
    if (!selectedAccount) return;
    try {
      const res = await recordPayment({
        accountId: selectedAccount._id,
        amount: parseLocalizedNumber(values.amount),
        date: typeof values.date === 'object' && values.date?.toISOString ? values.date.toISOString() : values.date,
        note: values.note?.trim(),
      }).unwrap();
      toastMessage({ icon: 'success', text: translateDebtorMessage(res.message) });
      paymentForm.resetFields();
      refetch();
      if (res.data?.status === 'SETTLED') {
        setDetailsOpen(false);
        setSelectedAccount(null);
      } else {
        setSelectedAccount(res.data);
      }
    } catch (error: any) {
      toastMessage({ icon: 'error', text: translateDebtorMessage(error?.data?.message) });
    }
  };

  const handleSettle = async (account: DebtorAccount) => {
    try {
      const res = await settleAccount(account._id).unwrap();
      toastMessage({ icon: 'success', text: translateDebtorMessage(res.message) });
      setDetailsOpen(false);
      setSelectedAccount(null);
      refetch();
    } catch (error: any) {
      toastMessage({ icon: 'error', text: translateDebtorMessage(error?.data?.message) });
    }
  };

  const debtEntryColumns: TableColumnsType<DebtEntry> = [
    {
      title: t('debtDate'),
      dataIndex: 'date',
      key: 'date',
      render: (value?: string) => (value ? formatDate(value, language) : emptyValue),
    },
    {
      title: t('debtAmount'),
      dataIndex: 'amount',
      key: 'amount',
      align: 'center',
      render: (value: number) => money(Number(value || 0)),
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
    {
      title: t('medicineNames'),
      dataIndex: 'medicinesTaken',
      key: 'medicinesTaken',
      render: (value: string) => value || emptyValue,
    },
  ];

  const paymentEntryColumns: TableColumnsType<PaymentEntry> = [
    {
      title: t('date'),
      dataIndex: 'date',
      key: 'date',
      render: (value?: string) => (value ? formatDate(value, language) : emptyValue),
    },
    {
      title: t('amount'),
      dataIndex: 'amount',
      key: 'amount',
      align: 'center',
      render: (value: number) => money(Number(value || 0)),
    },
    {
      title: t('note'),
      dataIndex: 'note',
      key: 'note',
      render: (value: string) => value || emptyValue,
    },
  ];

  const activeColumns: TableColumnsType<DebtorAccount> = [
    {
      title: t('customerName'),
      dataIndex: 'customerName',
      key: 'customerName',
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
      title: t('totalDebt'),
      dataIndex: 'currentDebt',
      key: 'currentDebt',
      align: 'center',
      render: (value: number) => <Tag color='error'>{money(Number(value || 0))}</Tag>,
    },
    {
      title: t('debtRecordsCount'),
      key: 'debtRecordsCount',
      align: 'center',
      render: (_, row) => formatNumberByLanguage(row.debtEntries?.length || 0, language),
    },
    {
      title: t('lastActivityDate'),
      dataIndex: 'lastDebtDate',
      key: 'lastDebtDate',
      align: 'center',
      render: (value?: string) => (value ? formatDate(value, language) : emptyValue),
    },
    {
      title: t('action'),
      key: 'action',
      align: 'center',
      render: (_, row) => (
        <Button
          type='primary'
          icon={<EyeOutlined />}
          className='btn-role-view'
          onClick={(event) => {
            event.stopPropagation();
            openAccountDetails(row);
          }}
        >
          {t('viewAccountDetails')}
        </Button>
      ),
    },
  ];

  const settledColumns: TableColumnsType<DebtorAccount> = [
    {
      title: t('customerName'),
      dataIndex: 'customerName',
      key: 'customerName',
      render: (value: string) => <strong>{value}</strong>,
    },
    {
      title: t('debtAmount'),
      dataIndex: 'settlementTotalDebt',
      key: 'settlementTotalDebt',
      align: 'center',
      render: (value: number) => money(Number(value || 0)),
    },
    {
      title: t('settlementDate'),
      dataIndex: 'settledAt',
      key: 'settledAt',
      align: 'center',
      render: (value?: string) => (value ? formatDate(value, language) : emptyValue),
    },
    {
      title: t('reason'),
      dataIndex: 'settlementReasonSummary',
      key: 'settlementReasonSummary',
      render: (value: string) => value || emptyValue,
    },
    {
      title: t('action'),
      key: 'action',
      align: 'center',
      render: (_, row) => (
        <Button type='default' icon={<FileTextOutlined />} onClick={() => openAccountDetails(row)}>
          {t('viewAccountDetails')}
        </Button>
      ),
    },
  ];

  return (
    <div className='secondary-page customer-debtor-page page-fade-in'>
      <Flex className='secondary-page-header customer-page-header' justify='space-between' align='center' gap={16} wrap='wrap'>
        <div>
          <span>{t('customers')}</span>
          <h1>{t('customerDebtors')}</h1>
          <p>{t('customerDebtorsDescription')}</p>
        </div>
        <TeamOutlined />
      </Flex>

      <Row gutter={[14, 14]} className='secondary-summary-row'>
        <Col xs={24} md={8}>
          <div className='secondary-summary-card is-total'>
            <Statistic title={t('customers')} value={formatNumberByLanguage(summary.customers, language)} />
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className='secondary-summary-card is-danger'>
            <Statistic
              title={statusFilter === 'active' ? t('totalDebt') : t('totalDebt')}
              value={summary.debt}
              formatter={(value) => money(Number(value))}
            />
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className='secondary-summary-card is-success'>
            <Statistic title={t('totalPayments')} value={summary.payments} formatter={(value) => money(Number(value))} />
          </div>
        </Col>
      </Row>

      <div className='cashbox-form-card customer-debtor-form-card'>
        <div className='cashbox-card-title'>
          <UserOutlined />
          <div>
            <h2>{t('recordCustomerDebt')}</h2>
            <p>{t('recordCustomerDebtHelp')}</p>
          </div>
        </div>
        <Form form={form} layout='vertical' onFinish={submitDebt}>
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12} xl={6}>
              <Form.Item name='customerName' label={t('customerName')} rules={[{ required: true, message: t('customerNameRequired') }]}>
                <Input placeholder={t('customerName')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Form.Item name='date' label={t('debtDate')} rules={[{ required: true, message: t('dateRequired') }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Form.Item
                name='amount'
                label={t('debtAmount')}
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
              <Form.Item name='reason' label={t('reason')} rules={[{ required: true, message: t('debtReasonRequired') }]}>
                <Input placeholder={t('debtReasonPlaceholder')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Form.Item name='medicinesTaken' label={t('medicineNames')}>
                <Input placeholder={t('medicineNames')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={18}>
              <Form.Item name='notes' label={t('note')}>
                <Input.TextArea rows={2} placeholder={t('noteOptional')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6} className='customer-debtor-form-action'>
              <Form.Item label=' '>
                <Button type='primary' htmlType='submit' className='btn-role-add' block loading={isSaving}>
                  {t('recordCustomerDebt')}
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </div>

      <Flex justify='space-between' align='center' gap={16} className='secondary-toolbar' wrap='wrap'>
        <div>
          <h2>{t('customerAccountPage')}</h2>
          <p>{statusFilter === 'active' ? t('customerDebtorsSubtitle') : t('settledDebtorsSubtitle')}</p>
        </div>
        <Flex gap={12} wrap='wrap' align='center'>
          <Segmented
            value={statusFilter}
            onChange={(value) => {
              const nextStatus = value as DebtorStatusFilter;
              setStatusFilter(nextStatus);
              setQuery((prev) => ({ ...prev, page: 1, status: nextStatus }));
            }}
            options={[
              { label: t('activeDebtors'), value: 'active' },
              { label: t('settledDebtors'), value: 'settled' },
            ]}
          />
          <Input
            allowClear
            size='large'
            prefix={<SearchOutlined />}
            placeholder={t('searchCustomerDebtors')}
            style={{ maxWidth: 360 }}
            onChange={(event) => setQuery((prev) => ({ ...prev, page: 1, search: event.target.value }))}
          />
        </Flex>
      </Flex>

      <div className='secondary-table-card'>
        <Table
          loading={isFetching}
          columns={statusFilter === 'active' ? activeColumns : settledColumns}
          dataSource={rows}
          rowKey='_id'
          scroll={{ x: 980 }}
          pagination={{
            current: query.page,
            pageSize: query.limit,
            total: data?.meta?.total,
            onChange: (page) => setQuery((prev) => ({ ...prev, page })),
          }}
          locale={{ emptyText: t('noDebtorAccounts') }}
          onRow={
            statusFilter === 'active'
              ? (record) => ({
                  onClick: () => openAccountDetails(record),
                  style: { cursor: 'pointer' },
                })
              : undefined
          }
        />
      </div>

      <Modal
        title={t('debtorAccountDetails')}
        open={detailsOpen}
        onCancel={() => setDetailsOpen(false)}
        footer={
          selectedAccount?.status === 'ACTIVE' ? (
            <Flex justify='space-between' align='center' wrap='wrap' gap={12}>
              <Popconfirm
                title={t('settleAccountConfirmTitle')}
                description={t('settleAccountConfirmDescription')}
                okText={t('settleAccount')}
                cancelText={t('cancel')}
                onConfirm={() => selectedAccount && handleSettle(selectedAccount)}
              >
                <Button type='primary' icon={<CheckCircleOutlined />} className='btn-role-add' loading={isSettling}>
                  {t('settleAccount')}
                </Button>
              </Popconfirm>
              <Button onClick={() => setDetailsOpen(false)}>{t('close')}</Button>
            </Flex>
          ) : (
            <Button onClick={() => setDetailsOpen(false)}>{t('close')}</Button>
          )
        }
        width={960}
        destroyOnClose
      >
        {selectedAccount ? (
          <>
            <Descriptions bordered size='small' column={{ xs: 1, sm: 2 }} className='customer-debtor-detail-summary'>
              <Descriptions.Item label={t('customerName')}>{selectedAccount.customerName}</Descriptions.Item>
              <Descriptions.Item label={t('accountCreationDate')}>
                {selectedAccount.accountCreatedAt ? formatDate(selectedAccount.accountCreatedAt, language) : emptyValue}
              </Descriptions.Item>
              <Descriptions.Item label={selectedAccount.status === 'ACTIVE' ? t('currentDebt') : t('debtAmount')}>
                <Tag color={selectedAccount.status === 'ACTIVE' ? 'error' : 'success'}>
                  {money(Number(selectedAccount.status === 'ACTIVE' ? selectedAccount.currentDebt : selectedAccount.settlementTotalDebt || selectedAccount.totalDebt))}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('totalPayments')}>
                {money(Number(selectedAccount.totalPayments || 0))}
              </Descriptions.Item>
              {selectedAccount.status === 'SETTLED' && selectedAccount.settledAt ? (
                <Descriptions.Item label={t('settlementDate')}>{formatDate(selectedAccount.settledAt, language)}</Descriptions.Item>
              ) : null}
              {selectedAccount.accountNotes ? (
                <Descriptions.Item label={t('note')} span={2}>
                  {selectedAccount.accountNotes}
                </Descriptions.Item>
              ) : null}
            </Descriptions>
            <h3 className='customer-debtor-detail-history-title'>{t('debtHistory')}</h3>
            <Table
              columns={debtEntryColumns}
              dataSource={selectedAccount.debtEntries}
              rowKey='_id'
              pagination={{ pageSize: 8 }}
              scroll={{ x: 860 }}
              locale={{ emptyText: t('noDebtHistory') }}
            />
            {selectedAccount.status === 'ACTIVE' ? (
              <>
                <h3 className='customer-debtor-detail-history-title'>{t('recordPayment')}</h3>
                <Form form={paymentForm} layout='vertical' onFinish={submitPayment}>
                  <Row gutter={[12, 0]}>
                    <Col xs={24} md={8}>
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
                        <InputNumber min={0.01} max={selectedAccount.currentDebt} parser={inputNumberParser} style={{ width: '100%' }} addonAfter={getCurrencyAddonByLanguage(language)} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name='date' label={t('date')} rules={[{ required: true, message: t('dateRequired') }]}>
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name='note' label={t('note')}>
                        <Input placeholder={t('noteOptional')} />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Button type='primary' htmlType='submit' className='btn-role-pay' loading={isPaying}>
                        {t('recordPayment')}
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </>
            ) : null}
            <h3 className='customer-debtor-detail-history-title'>{t('paymentHistory')}</h3>
            <Table
              columns={paymentEntryColumns}
              dataSource={selectedAccount.paymentEntries || []}
              rowKey='_id'
              pagination={{ pageSize: 8 }}
              scroll={{ x: 640 }}
              locale={{ emptyText: t('noPaymentHistory') }}
            />
          </>
        ) : null}
      </Modal>
    </div>
  );
};

export default CustomerDebtorsPage;
