import { DeleteFilled, DollarOutlined, PlusOutlined, TeamOutlined } from '@ant-design/icons';
import { Button, Col, Descriptions, Flex, Form, Input, Modal, Row, Statistic, Table, Tag } from 'antd';
import { useMemo, useState } from 'react';
import {
  useCreateCustomerMutation,
  useCreateCustomerPaymentMutation,
  useDeleteCustomerMutation,
  useGetCustomerBalanceQuery,
  useGetCustomerLedgersQuery,
  useGetCustomersQuery,
} from '../redux/features/management/customerApi';
import { useLanguage } from '../i18n/LanguageContext';
import toastMessage from '../lib/toastMessage';
import { formatCurrencyByLanguage, formatNumberByLanguage, getCurrencyAddonByLanguage } from '../utils/formatters';
import { isValidLocalizedNumber, normalizeNumberString, parseLocalizedNumber } from '../utils/numberNormalizer';

const CustomerManagementPage = () => {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [form] = Form.useForm();
  const [payForm] = Form.useForm();
  const { data, isFetching, refetch } = useGetCustomersQuery({ limit: 50 });
  const [createCustomer] = useCreateCustomerMutation();
  const [deleteCustomer] = useDeleteCustomerMutation();
  const [createPayment] = useCreateCustomerPaymentMutation();
  const { data: balanceData } = useGetCustomerBalanceQuery(selectedId, { skip: !selectedId || !payOpen });
  const { data: ledgers } = useGetCustomerLedgersQuery({ limit: 500 });

  const selectedCustomer = useMemo(
    () => (data?.data || []).find((customer: { _id: string }) => customer._id === selectedId),
    [data?.data, selectedId],
  );

  const customerSummary = useMemo(() => {
    const rows = ledgers?.data || [];
    const debt = rows.reduce((total: number, row: { type: string; amount: number }) => {
      if (row.type === 'DEBIT') return total + Number(row.amount || 0);
      if (row.type === 'CREDIT') return total - Number(row.amount || 0);
      return total;
    }, 0);
    const payments = rows
      .filter((row: { type: string }) => row.type === 'CREDIT')
      .reduce((total: number, row: { amount: number }) => total + Number(row.amount || 0), 0);

    return {
      customers: data?.data?.length || 0,
      debt: Math.max(debt, 0),
      payments,
    };
  }, [data?.data?.length, ledgers?.data]);

  const onCreate = async () => {
    const values = await form.validateFields();
    try {
      const res = await createCustomer(values).unwrap();
      toastMessage({ icon: 'success', text: res.message });
      setOpen(false);
      form.resetFields();
      refetch();
    } catch (error: any) {
      toastMessage({ icon: 'error', text: error?.data?.message || t('failed') });
    }
  };

  const onPay = async () => {
    const values = await payForm.validateFields();
    try {
      const res = await createPayment({ customer: selectedId, ...values, amount: parseLocalizedNumber(values.amount) }).unwrap();
      toastMessage({ icon: 'success', text: res.message });
      setPayOpen(false);
      payForm.resetFields();
      refetch();
    } catch (error: any) {
      toastMessage({ icon: 'error', text: error?.data?.message || t('failed') });
    }
  };

  const columns = [
    { title: t('name'), dataIndex: 'name', key: 'name' },
    { title: t('phone'), dataIndex: 'phone', key: 'phone' },
    { title: t('address'), dataIndex: 'address', key: 'address' },
    {
      title: t('action'),
      key: 'action',
      align: 'center' as const,
      render: (_: unknown, row: { _id: string }) => (
        <Flex gap={8} className='table-actions' justify='center'>
          <Button
            size='middle'
            icon={<DollarOutlined />}
            className='btn-role-pay'
            onClick={() => {
              setSelectedId(row._id);
              setPayOpen(true);
            }}
          >
            {t('payment')}
          </Button>
          <Button
            size='middle'
            danger
            icon={<DeleteFilled />}
            className='btn-role-delete'
            onClick={async () => {
              await deleteCustomer(row._id).unwrap();
              refetch();
            }}
          >
            {t('delete')}
          </Button>
        </Flex>
      ),
    },
  ];

  return (
    <div className='secondary-page customer-page page-fade-in'>
      <Flex className='secondary-page-header customer-page-header' justify='space-between' align='center' gap={16} wrap='wrap'>
        <div>
          <span>{t('customers')}</span>
          <h1>{t('customers')}</h1>
          <p>{t('customerPayment')}</p>
        </div>
        <TeamOutlined />
      </Flex>

      <Row gutter={[14, 14]} className='secondary-summary-row'>
        <Col xs={24} md={8}>
          <div className='secondary-summary-card is-total'>
            <Statistic title={t('customers')} value={formatNumberByLanguage(customerSummary.customers, language)} />
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className='secondary-summary-card is-danger'>
            <Statistic title={t('totalDebt')} value={formatCurrencyByLanguage(customerSummary.debt, language)} />
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className='secondary-summary-card is-success'>
            <Statistic title={t('totalPayments')} value={formatCurrencyByLanguage(customerSummary.payments, language)} />
          </div>
        </Col>
      </Row>

      <Flex justify='space-between' align='center' gap={16} className='secondary-toolbar' wrap='wrap'>
        <div>
          <h2>{t('customers')}</h2>
          <p>{t('customerPayment')}</p>
        </div>
        <Button type='primary' icon={<PlusOutlined />} className='btn-role-create' onClick={() => setOpen(true)}>
          {t('createCustomer')}
        </Button>
      </Flex>

      <div className='secondary-table-card'>
        <Table
          loading={isFetching}
          columns={columns}
          dataSource={data?.data || []}
          rowKey='_id'
          scroll={{ x: 760 }}
        />
      </div>

      <Modal title={t('createCustomer')} open={open} onOk={onCreate} onCancel={() => setOpen(false)}>
        <Form form={form} layout='vertical'>
          <Form.Item name='name' label={t('name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name='phone' label={t('phone')}>
            <Input />
          </Form.Item>
          <Form.Item name='address' label={t('address')}>
            <Input />
          </Form.Item>
          <Form.Item name='note' label={t('note')}>
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={t('payment')} open={payOpen} onOk={onPay} onCancel={() => setPayOpen(false)} className='customer-payment-modal'>
        <Descriptions bordered size='small' column={1} className='customer-payment-summary'>
          <Descriptions.Item label={t('name')}>{selectedCustomer?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('balance')}>
            <Tag color={(balanceData?.data?.balance ?? 0) > 0 ? 'error' : 'success'}>
              {formatCurrencyByLanguage(balanceData?.data?.balance ?? 0, language)}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
        <Form form={payForm} layout='vertical'>
          <Form.Item
            name='amount'
            label={t('amount')}
            normalize={normalizeNumberString}
            rules={[
              { required: true, message: t('amountRequired') },
              {
                validator: (_, value) =>
                  isValidLocalizedNumber(value, 0.01)
                    ? Promise.resolve()
                    : Promise.reject(new Error(t('amountMin'))),
              },
            ]}
          >
            <Input inputMode='decimal' pattern='[0-9۰-۹٠-٩.,٫٬]*' addonAfter={getCurrencyAddonByLanguage(language)} />
          </Form.Item>
          <Form.Item name='note' label={t('note')}>
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CustomerManagementPage;
