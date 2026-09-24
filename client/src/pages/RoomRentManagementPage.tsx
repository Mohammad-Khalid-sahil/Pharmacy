import { DollarOutlined, EyeOutlined, HomeOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Col, Descriptions, Flex, Form, Input, InputNumber, Modal, Row, Select, Statistic, Table, Tag } from 'antd';
import { useState } from 'react';
import SearchInput from '../components/SearchInput';
import {
  useAddRoomRentPaymentMutation,
  useAddRoomRentUnpaidMonthMutation,
  useCreateRoomRentAccountMutation,
  useGetRoomRentAccountsQuery,
} from '../redux/features/management/roomRentApi';
import { IRoomRentAccount, RoomRentSummary } from '../types/roomRent.types';
import { useLanguage } from '../i18n/LanguageContext';
import toastMessage from '../lib/toastMessage';
import { formatCurrencyByLanguage } from '../utils/formatters';
import { inputNumberParser, parseLocalizedNumber } from '../utils/numberNormalizer';

const emptySummary: RoomRentSummary = {
  totalDebt: 0,
  totalPayments: 0,
  remainingBalance: 0,
};

const RoomRentManagementPage = () => {
  const { t, language } = useLanguage();
  const formatMoney = (value: number) => formatCurrencyByLanguage(value, language);
  const [query, setQuery] = useState({ page: 1, limit: 10, search: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<IRoomRentAccount | null>(null);
  const [unpaidMonthOpen, setUnpaidMonthOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [unpaidMonthForm] = Form.useForm();
  const [paymentForm] = Form.useForm();

  const { data, isFetching, refetch } = useGetRoomRentAccountsQuery(query);
  const [createAccount, { isLoading: creating }] = useCreateRoomRentAccountMutation();
  const [addUnpaidMonth, { isLoading: addingMonth }] = useAddRoomRentUnpaidMonthMutation();
  const [addPayment, { isLoading: paying }] = useAddRoomRentPaymentMutation();

  const rows: IRoomRentAccount[] = data?.data || [];
  const summary: RoomRentSummary = {
    totalDebt: Number(data?.summary?.totalDebt ?? 0),
    totalPayments: Number(data?.summary?.totalPayments ?? 0),
    remainingBalance: Number(data?.summary?.remainingBalance ?? 0),
  };

  const neighborTypeLabel = (value: string) => (value === 'LABORATORY' ? t('laboratoryRoom') : t('doctorRoom'));

  const onCreate = async () => {
    const values = await createForm.validateFields();
    try {
      const res = await createAccount({
        neighborName: String(values.neighborName).trim(),
        neighborType: values.neighborType,
        monthlyRent: parseLocalizedNumber(values.monthlyRent),
      }).unwrap();
      toastMessage({ icon: 'success', text: res.message || t('roomRentAccountCreated') });
      setCreateOpen(false);
      createForm.resetFields();
      refetch();
    } catch (error: any) {
      toastMessage({ icon: 'error', text: error?.data?.message || t('roomRentAccountFailed') });
    }
  };

  const onAddUnpaidMonth = async () => {
    if (!selectedAccount) return;
    const values = await unpaidMonthForm.validateFields();
    try {
      const res = await addUnpaidMonth({
        account: selectedAccount._id,
        date: values.date,
        note: values.note,
      }).unwrap();
      toastMessage({ icon: 'success', text: res.message || t('roomRentUnpaidMonthAdded') });
      setUnpaidMonthOpen(false);
      unpaidMonthForm.resetFields();
      setSelectedAccount(res.data);
      refetch();
    } catch (error: any) {
      toastMessage({ icon: 'error', text: error?.data?.message || t('roomRentUnpaidMonthFailed') });
    }
  };

  const onPayment = async () => {
    if (!selectedAccount) return;
    const values = await paymentForm.validateFields();
    try {
      const res = await addPayment({
        account: selectedAccount._id,
        amount: parseLocalizedNumber(values.amount),
        date: values.date,
        note: values.note,
      }).unwrap();
      toastMessage({ icon: 'success', text: res.message || t('roomRentPaymentRecorded') });
      setPaymentOpen(false);
      paymentForm.resetFields();
      setSelectedAccount(res.data);
      refetch();
    } catch (error: any) {
      toastMessage({ icon: 'error', text: error?.data?.message || t('roomRentPaymentFailed') });
    }
  };

  const columns = [
    { title: t('neighborName'), dataIndex: 'neighborName', key: 'neighborName', render: (v: string) => <strong>{v}</strong> },
    {
      title: t('neighborType'),
      dataIndex: 'neighborType',
      key: 'neighborType',
      render: (v: string) => <Tag color='blue'>{neighborTypeLabel(v)}</Tag>,
    },
    {
      title: t('monthlyRent'),
      dataIndex: 'monthlyRent',
      key: 'monthlyRent',
      align: 'center' as const,
      render: (v: number) => formatMoney(v),
    },
    {
      title: t('unpaidMonths'),
      dataIndex: 'unpaidMonths',
      key: 'unpaidMonths',
      align: 'center' as const,
      render: (v: number) => <Tag color={v > 0 ? 'warning' : 'success'}>{v || 0}</Tag>,
    },
    {
      title: t('totalDebt'),
      dataIndex: 'totalDebt',
      key: 'totalDebt',
      align: 'center' as const,
      render: (v: number) => formatMoney(v || 0),
    },
    {
      title: t('remainingBalance'),
      dataIndex: 'remainingBalance',
      key: 'remainingBalance',
      align: 'center' as const,
      render: (v: number) => <Tag color={v > 0 ? 'error' : 'success'}>{formatMoney(v || 0)}</Tag>,
    },
    {
      title: t('action'),
      key: 'action',
      render: (_: unknown, row: IRoomRentAccount) => (
        <Button className='btn-role-view' icon={<EyeOutlined />} onClick={() => setSelectedAccount(row)}>
          {t('view')}
        </Button>
      ),
    },
  ];

  return (
    <div className='room-rent-page page-fade-in'>
      <div className='room-rent-page-header'>
        <div>
          <span>{t('roomRentPageSubtitle')}</span>
          <h1>{t('roomRent')}</h1>
          <p>{t('roomRentPageDescription')}</p>
        </div>
        <HomeOutlined />
      </div>

      <Row gutter={[14, 14]} className='room-rent-summary-row'>
        <Col xs={24} md={8}>
          <div className='room-rent-summary-card is-debt'>
            <Statistic title={t('totalDebt')} value={formatMoney(summary.totalDebt ?? emptySummary.totalDebt)} />
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className='room-rent-summary-card is-paid'>
            <Statistic title={t('totalPayments')} value={formatMoney(summary.totalPayments ?? emptySummary.totalPayments)} />
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className='room-rent-summary-card is-balance'>
            <Statistic title={t('remainingBalance')} value={formatMoney(summary.remainingBalance ?? emptySummary.remainingBalance)} />
          </div>
        </Col>
      </Row>

      <Flex className='room-rent-toolbar page-toolbar' justify='space-between' align='center' wrap gap={12}>
        <SearchInput setQuery={setQuery} placeholder={t('searchNeighbor')} />
        <Button type='primary' icon={<PlusOutlined />} className='btn-role-add' onClick={() => setCreateOpen(true)}>
          {t('addNeighbor')}
        </Button>
      </Flex>

      <div className='room-rent-table-card'>
        <Table
          loading={isFetching}
          dataSource={rows}
          columns={columns}
          rowKey='_id'
          pagination={{
            current: query.page,
            pageSize: query.limit,
            total: data?.meta?.total || rows.length,
            onChange: (page, limit) => setQuery((current) => ({ ...current, page, limit })),
          }}
          scroll={{ x: 980 }}
        />
      </div>

      <Modal
        title={t('addNeighbor')}
        open={createOpen}
        onOk={onCreate}
        onCancel={() => setCreateOpen(false)}
        confirmLoading={creating}
        destroyOnClose
        className='room-rent-modal'
      >
        <Form form={createForm} layout='vertical' initialValues={{ neighborType: 'DOCTOR' }}>
          <Form.Item name='neighborName' label={t('neighborName')} rules={[{ required: true, message: t('neighborNameRequired') }]}>
            <Input />
          </Form.Item>
          <Form.Item name='neighborType' label={t('neighborType')} rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'DOCTOR', label: t('doctorRoom') },
                { value: 'LABORATORY', label: t('laboratoryRoom') },
              ]}
            />
          </Form.Item>
          <Form.Item name='monthlyRent' label={t('monthlyRent')} rules={[{ required: true, message: t('amountRequired') }]}>
            <InputNumber min={0.01} parser={inputNumberParser} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('roomRentDetails')}
        open={!!selectedAccount && !unpaidMonthOpen && !paymentOpen}
        onCancel={() => setSelectedAccount(null)}
        footer={[
          <Button
            key='month'
            className='btn-role-neutral'
            onClick={() => {
              unpaidMonthForm.setFieldsValue({ date: new Date().toISOString().slice(0, 10) });
              setUnpaidMonthOpen(true);
            }}
          >
            {t('addUnpaidMonth')}
          </Button>,
          <Button
            key='pay'
            type='primary'
            className='btn-role-pay'
            icon={<DollarOutlined />}
            onClick={() => {
              paymentForm.setFieldsValue({ date: new Date().toISOString().slice(0, 10) });
              setPaymentOpen(true);
            }}
          >
            {t('recordPayment')}
          </Button>,
        ]}
        width={920}
        className='room-rent-detail-modal'
      >
        {selectedAccount && (
          <>
            <p className='room-rent-formula-hint'>{t('debtFormulaHint')}</p>
            <Descriptions bordered size='small' column={2}>
              <Descriptions.Item label={t('neighborName')}>{selectedAccount.neighborName}</Descriptions.Item>
              <Descriptions.Item label={t('neighborType')}>{neighborTypeLabel(selectedAccount.neighborType)}</Descriptions.Item>
              <Descriptions.Item label={t('monthlyRent')}>{formatMoney(selectedAccount.monthlyRent)}</Descriptions.Item>
              <Descriptions.Item label={t('unpaidMonths')}>{selectedAccount.unpaidMonths || 0}</Descriptions.Item>
              <Descriptions.Item label={t('totalDebt')}>{formatMoney(selectedAccount.totalDebt || 0)}</Descriptions.Item>
              <Descriptions.Item label={t('totalPayments')}>{formatMoney(selectedAccount.totalPayments || 0)}</Descriptions.Item>
              <Descriptions.Item label={t('remainingBalance')} span={2}>
                <Tag color={selectedAccount.remainingBalance > 0 ? 'error' : 'success'}>
                  {formatMoney(selectedAccount.remainingBalance || 0)}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
            <h3 className='room-rent-section-title'>{t('unpaidMonthHistory')}</h3>
            <Table
              size='small'
              dataSource={selectedAccount.unpaidMonthEntries || []}
              rowKey='_id'
              pagination={false}
              columns={[
                { title: t('date'), dataIndex: 'date', key: 'date' },
                { title: t('period'), dataIndex: 'period', key: 'period' },
                { title: t('amount'), dataIndex: 'amount', key: 'amount', render: (v: number) => formatMoney(v) },
                { title: t('note'), dataIndex: 'note', key: 'note', render: (v: string) => v || '-' },
              ]}
            />
            <h3 className='room-rent-section-title'>{t('paymentHistory')}</h3>
            <Table
              size='small'
              dataSource={selectedAccount.paymentEntries || []}
              rowKey='_id'
              pagination={false}
              columns={[
                { title: t('date'), dataIndex: 'date', key: 'date' },
                { title: t('amount'), dataIndex: 'amount', key: 'amount', render: (v: number) => formatMoney(v) },
                { title: t('note'), dataIndex: 'note', key: 'note', render: (v: string) => v || '-' },
              ]}
            />
          </>
        )}
      </Modal>

      <Modal
        title={t('addUnpaidMonth')}
        open={unpaidMonthOpen}
        onOk={onAddUnpaidMonth}
        onCancel={() => setUnpaidMonthOpen(false)}
        confirmLoading={addingMonth}
        destroyOnClose
      >
        {selectedAccount && (
          <p className='room-rent-formula-hint'>
            {t('monthlyRent')}: {formatMoney(selectedAccount.monthlyRent)} — {t('unpaidMonths')}: {selectedAccount.unpaidMonths || 0}
          </p>
        )}
        <Form form={unpaidMonthForm} layout='vertical'>
          <Form.Item name='date' label={t('date')} rules={[{ required: true }]}>
            <Input type='date' />
          </Form.Item>
          <Form.Item name='note' label={t('noteOptional')}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('recordPayment')}
        open={paymentOpen}
        onOk={onPayment}
        onCancel={() => setPaymentOpen(false)}
        confirmLoading={paying}
        destroyOnClose
      >
        {selectedAccount && (
          <p className='room-rent-formula-hint'>
            {t('remainingBalance')}: {formatMoney(selectedAccount.remainingBalance || 0)}
          </p>
        )}
        <Form form={paymentForm} layout='vertical'>
          <Form.Item name='amount' label={t('amount')} rules={[{ required: true, message: t('amountRequired') }]}>
            <InputNumber min={0.01} parser={inputNumberParser} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name='date' label={t('date')} rules={[{ required: true }]}>
            <Input type='date' />
          </Form.Item>
          <Form.Item name='note' label={t('noteOptional')}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoomRentManagementPage;
