import { DeleteFilled, DollarOutlined, EditFilled, FileTextOutlined, PlusOutlined } from '@ant-design/icons';
import type { PaginationProps, TableColumnsType } from 'antd';
import { Button, Col, Descriptions, Flex, Form, Input, Modal, Pagination, Row, Statistic, Table, Tag } from 'antd';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  useCreateSellerMutation,
  useDeleteSellerMutation,
  useGetAllSellerQuery,
  useUpdateSellerMutation,
} from '../../redux/features/management/sellerApi';
import { ISeller } from '../../types/product.types';
import toastMessage from '../../lib/toastMessage';
import SearchInput from '../../components/SearchInput';
import { Language, useLanguage } from '../../i18n/LanguageContext';
import {
  useGetSellerBalanceQuery,
  useGetSellerLedgersQuery,
} from '../../redux/features/management/cashboxApi';
import SellerPayModal from '../../components/purchase/SellerPayModal';
import formatDate from '../../utils/formatDate';
import { formatCurrencyByLanguage } from '../../utils/formatters';

const SellerManagementPage = () => {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState({
    page: 1,
    limit: 10,
    search: '',
  });
  const [form] = Form.useForm();
  const [formOpen, setFormOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<ISeller | null>(null);
  const [accountSeller, setAccountSeller] = useState<ISeller | null>(null);
  const [paySeller, setPaySeller] = useState<ISeller | null>(null);

  const { data, isFetching, refetch } = useGetAllSellerQuery(query);
  const [createSeller, { isLoading: isCreating }] = useCreateSellerMutation();
  const [updateSeller, { isLoading: isUpdating }] = useUpdateSellerMutation();

  const onChange: PaginationProps['onChange'] = (page) => {
    setQuery((prev) => ({ ...prev, page: page }));
  };

  const tableData = data?.data?.map((seller: ISeller) => ({
    key: seller._id,
    _id: seller._id,
    name: seller.name,
    email: seller.email,
    contactNo: seller.contactNo,
  }));

  const openCreate = () => {
    setEditingSeller(null);
    form.resetFields();
    setFormOpen(true);
  };

  const openEdit = (seller: ISeller) => {
    setEditingSeller(seller);
    form.setFieldsValue({
      name: seller.name,
      email: seller.email,
      contactNo: seller.contactNo,
    });
    setFormOpen(true);
  };

  const submitSeller = async () => {
    const values = await form.validateFields();
    try {
      const res = editingSeller
        ? await updateSeller({ id: editingSeller._id, payload: values }).unwrap()
        : await createSeller(values).unwrap();
      toastMessage({ icon: 'success', text: res.message || t('submit') });
      setFormOpen(false);
      setEditingSeller(null);
      form.resetFields();
      refetch();
    } catch (error: any) {
      toastMessage({ icon: 'error', text: error?.data?.message || 'Failed' });
    }
  };

  const columns: TableColumnsType<any> = [
    {
      title: t('sellerName'),
      key: 'name',
      dataIndex: 'name',
    },
    {
      title: t('email'),
      key: 'email',
      dataIndex: 'email',
      align: 'center',
    },
    {
      title: t('contactNumber'),
      key: 'contactNo',
      dataIndex: 'contactNo',
      align: 'center',
    },
    {
      title: t('action'),
      key: 'x',
      align: 'center',
      render: (item) => {
        return (
          <Flex gap={8} className='table-actions' justify='center' wrap>
            <Button
              size='middle'
              className='btn-role-view'
              icon={<FileTextOutlined />}
              onClick={() => setAccountSeller(item)}
            >
              {t('sellerAccount')}
            </Button>
            <Button
              size='middle'
              className='btn-role-pay'
              icon={<DollarOutlined />}
              onClick={() => setPaySeller(item)}
            >
              {t('paySeller')}
            </Button>
            <Button
              size='middle'
              className='btn-role-edit'
              onClick={() => openEdit(item)}
            >
              <EditFilled />
            </Button>
            <DeleteModal id={item.key} />
          </Flex>
        );
      },
      width: 'auto',
    },
  ];

  return (
    <div className='seller-page'>
      <div className='seller-page-header'>
        <div>
          <span>{t('sellers')}</span>
          <h1>{t('sellers')}</h1>
          <p>{t('sellerAccountSubtitle')}</p>
        </div>
      </div>

      <Flex justify='space-between' align='center' className='seller-toolbar page-toolbar' wrap='wrap' gap={12}>
        <SearchInput setQuery={setQuery} placeholder={t('searchSeller')} />
        <Button type='primary' icon={<PlusOutlined />} className='btn-role-create' onClick={openCreate}>
          {t('createSeller')}
        </Button>
      </Flex>
      <div className='seller-table-card'>
        <Table
          size='middle'
          loading={isFetching}
          columns={columns}
          dataSource={tableData}
          pagination={false}
          scroll={{ x: 850 }}
        />
      </div>
      <Flex justify='center' className='seller-pagination'>
        <Pagination
          current={query.page}
          onChange={onChange}
          defaultPageSize={query.limit}
          total={data?.meta?.total}
        />
      </Flex>

      <Modal
        title={editingSeller ? t('update') : t('createSeller')}
        open={formOpen}
        onOk={submitSeller}
        onCancel={() => setFormOpen(false)}
        confirmLoading={isCreating || isUpdating}
        destroyOnClose
      >
        <Form form={form} layout='vertical'>
          <Form.Item name='name' label={t('sellerName')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name='email' label={t('email')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name='contactNo' label={t('contactNumber')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <SellerAccountModal
        seller={accountSeller}
        language={language}
        onClose={() => setAccountSeller(null)}
        onPay={(seller) => setPaySeller(seller)}
      />
      <SellerPayModal
        open={!!paySeller}
        sellerId={paySeller?._id ?? null}
        sellerName={paySeller?.name ?? ''}
        onClose={() => setPaySeller(null)}
      />
    </div>
  );
};

const SellerAccountModal = ({
  seller,
  language,
  onClose,
  onPay,
}: {
  seller: ISeller | null;
  language: Language;
  onClose: () => void;
  onPay: (seller: ISeller) => void;
}) => {
  const { t } = useLanguage();
  const money = (value: number | undefined) => formatCurrencyByLanguage(value, language);
  const { data: balanceData, isFetching: loadingBalance } = useGetSellerBalanceQuery(
    seller?._id!,
    { skip: !seller?._id }
  );
  const { data: ledgers, isFetching: loadingLedgers } = useGetSellerLedgersQuery(
    { seller: seller?._id, limit: 500 },
    { skip: !seller?._id }
  );

  const rows = (ledgers?.data || []).map((row: any) => ({
    key: row._id,
    type: row.type,
    amount: row.amount,
    debit: row.debit || 0,
    credit: row.credit || 0,
    description: row.description || '-',
    createdAt: row.createdAt,
  }));
  const purchases = balanceData?.data?.purchases || 0;
  const payments = balanceData?.data?.payments || 0;
  const balance = balanceData?.data?.balance || 0;
  const chartData = [
    { name: t('totalPurchases'), value: purchases, color: '#0f766e' },
    { name: t('totalPayments'), value: payments, color: '#2563eb' },
    { name: t('remainingPayableBalance'), value: Math.max(balance, 0), color: '#f59e0b' },
  ];

  const printAccount = () => window.print();

  return (
    <Modal
      title={t('sellerAccount')}
      open={!!seller}
      onCancel={onClose}
      width={980}
      footer={null}
      destroyOnClose
    >
      {seller && (
        <div className='seller-account-modal report-print-area'>
          <Flex className='no-print seller-account-actions' justify='space-between' align='center' wrap='wrap' gap={12}>
            <Descriptions size='small' column={1}>
              <Descriptions.Item label={t('sellerName')}>{seller.name}</Descriptions.Item>
              <Descriptions.Item label={t('email')}>{seller.email}</Descriptions.Item>
              <Descriptions.Item label={t('contactNumber')}>{seller.contactNo}</Descriptions.Item>
            </Descriptions>
            <Flex gap={8} wrap='wrap'>
              <Button className='btn-role-pay' onClick={() => onPay(seller)}>{t('paySeller')}</Button>
              <Button className='btn-role-print' onClick={printAccount}>{t('print')}</Button>
            </Flex>
          </Flex>

          <Row gutter={[12, 12]} className='seller-account-summary'>
            <Col xs={24} md={8}>
              <Statistic loading={loadingBalance} title={t('totalPurchases')} value={money(purchases)} />
            </Col>
            <Col xs={24} md={8}>
              <Statistic loading={loadingBalance} title={t('totalPayments')} value={money(payments)} />
            </Col>
            <Col xs={24} md={8}>
              <Statistic loading={loadingBalance} title={t('remainingPayableBalance')} value={money(balance)} />
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: '1rem' }}>
            <Col xs={24} lg={14}>
              <div className='seller-account-chart'>
                <h3>{t('purchasesVsPayments')}</h3>
                <ResponsiveContainer width='100%' height={240}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray='3 3' stroke='#e2edf1' />
                    <XAxis dataKey='name' />
                    <YAxis tickFormatter={(value) => money(Number(value))} width={90} />
                    <Tooltip formatter={(value, name) => [money(Number(value || 0)), String(name)]} />
                    <Bar dataKey='value' radius={[8, 8, 0, 0]}>
                      {chartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Col>
            <Col xs={24} lg={10}>
              <div className='seller-account-chart'>
                <h3>{t('remainingPayableBalance')}</h3>
                <ResponsiveContainer width='100%' height={240}>
                  <PieChart>
                    <Pie data={chartData} dataKey='value' nameKey='name' innerRadius={58} outerRadius={92} paddingAngle={4}>
                      {chartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value, name) => [money(Number(value || 0)), String(name)]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Col>
          </Row>

          <Table
            className='seller-account-ledger-table'
            size='small'
            loading={loadingLedgers}
            rowKey='key'
            dataSource={rows}
            pagination={{ pageSize: 8 }}
            scroll={{ x: 760 }}
            columns={[
              { title: t('date'), dataIndex: 'createdAt', key: 'createdAt', render: (date: string) => formatDate(date, language) },
              { title: t('type'), dataIndex: 'type', key: 'type', align: 'center', render: (type: string) => <Tag color={type === 'PAYMENT' ? 'blue' : 'green'}>{type}</Tag> },
              { title: t('amount'), dataIndex: 'amount', key: 'amount', align: 'center', render: (value: number) => money(value) },
              { title: t('debit'), dataIndex: 'debit', key: 'debit', align: 'center', render: (value: number) => money(value) },
              { title: t('credit'), dataIndex: 'credit', key: 'credit', align: 'center', render: (value: number) => money(value) },
              { title: t('description'), dataIndex: 'description', key: 'description' },
            ]}
          />
        </div>
      )}
    </Modal>
  );
};

/**
 * Delete Modal
 */
const DeleteModal = ({ id }: { id: string }) => {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteSeller] = useDeleteSellerMutation();

  const handleDelete = async (id: string) => {
    try {
      const res = await deleteSeller(id).unwrap();
      if (res.statusCode === 200) {
        toastMessage({ icon: 'success', text: res.message });
        handleCancel();
      }
    } catch (error: any) {
      handleCancel();
      toastMessage({ icon: 'error', text: error.data.message });
    }
  };

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Button
        onClick={showModal}
        type='primary'
        className='table-btn-small btn-role-delete'
      >
        <DeleteFilled />
      </Button>
      <Modal title={t('deleteTitle')} open={isModalOpen} onCancel={handleCancel} footer={null}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>{t('deleteQuestion')}</h2>
          <h4>{t('deleteWarning')}</h4>
          <div
            style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}
          >
            <Button
              onClick={handleCancel}
              type='primary'
              className='btn-role-neutral'
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={() => handleDelete(id)}
              type='primary'
              className='btn-role-delete'
            >
              {t('confirmDelete')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default SellerManagementPage;
