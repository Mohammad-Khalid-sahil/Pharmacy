import {
  CalendarOutlined,
  DeleteFilled,
  DollarOutlined,
  FileTextOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import type { PaginationProps, TableColumnsType } from 'antd';
import {
  Button,
  Col,
  DatePicker,
  Descriptions,
  Flex,
  Form,
  InputNumber,
  Modal,
  Pagination,
  Row,
  Select,
  Statistic,
  Table,
  Tag,
} from 'antd';
import { useMemo, useState } from 'react';
import SearchInput from '../../components/SearchInput';
import { Language, useLanguage } from '../../i18n/LanguageContext';
import toastMessage from '../../lib/toastMessage';
import {
  useCreatePurchaseMutation,
  useDeletePurchaseMutation,
  useGetAllPurchasesQuery,
} from '../../redux/features/management/purchaseApi';
import { useGetAllSellerQuery } from '../../redux/features/management/sellerApi';
import { useGetAllProductsQuery } from '../../redux/features/management/productApi';
import { IPurchase } from '../../types/purchase.types';
import formatDate from '../../utils/formatDate';
import SellerPayModal from '../../components/purchase/SellerPayModal';
import { formatCurrencyByLanguage, formatNumberByLanguage, getCurrencyAddonByLanguage } from '../../utils/formatters';
import { inputNumberParser, parseLocalizedNumber } from '../../utils/numberNormalizer';

const { RangePicker } = DatePicker;

type PurchaseRow = {
  key: string;
  sellerId: string;
  sellerName: string;
  productName: string;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  price: number;
  quantity: number;
  paid: number;
  totalPrice: number;
  due: number;
  date: string;
  createdAt: string;
};

const getSellerId = (seller: IPurchase['seller']) => {
  if (seller && typeof seller === 'object' && '_id' in seller) {
    return String((seller as { _id: string })._id);
  }

  return String(seller ?? '');
};

const paymentStatusColor = {
  PAID: 'success',
  PARTIAL: 'processing',
  UNPAID: 'warning',
} as const;

const paymentStatusKey = {
  PAID: 'paidStatus',
  PARTIAL: 'partialStatus',
  UNPAID: 'pendingStatus',
} as const;

const PurchaseManagementPage = () => {
  const { t, language } = useLanguage();
  const formatNumber = (value: number) => formatNumberByLanguage(value, language);
  const formatMoney = (value: number) => formatCurrencyByLanguage(value, language);
  const [paySeller, setPaySeller] = useState<{ id: string; name: string } | null>(null);
  const [detailPurchase, setDetailPurchase] = useState<PurchaseRow | null>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [sellerFilter, setSellerFilter] = useState<string>();
  const [rangePickerKey, setRangePickerKey] = useState(0);
  const [query, setQuery] = useState({
    page: 1,
    limit: 10,
    search: '',
    seller: undefined as string | undefined,
    startDate: undefined as string | undefined,
    endDate: undefined as string | undefined,
  });

  const { data, isFetching } = useGetAllPurchasesQuery(query);
  const { data: sellerData } = useGetAllSellerQuery({ page: 1, limit: 500 });
  const { data: productData } = useGetAllProductsQuery({ page: 1, limit: 1000 });

  const onChange: PaginationProps['onChange'] = (page) => {
    setQuery((prev) => ({ ...prev, page }));
  };

  const clearFilters = () => {
    setSearchInput('');
    setSellerFilter(undefined);
    setRangePickerKey((prev) => prev + 1);
    setQuery((prev) => ({
      ...prev,
      page: 1,
      search: '',
      seller: undefined,
      startDate: undefined,
      endDate: undefined,
    }));
  };

  const tableData = useMemo<PurchaseRow[]>(() => {
    return (
      data?.data?.map((purchase: IPurchase) => {
        const paid = Number(purchase.paid || 0);
        const totalPrice = Number(purchase.totalPrice || 0);
        const purchaseDate = purchase.purchaseDate || purchase.createdAt;

        return {
          key: purchase._id,
          sellerId: getSellerId(purchase.seller),
          sellerName: purchase.sellerName,
          productName: purchase.productName,
          paymentStatus: (purchase.paymentStatus || 'UNPAID') as PurchaseRow['paymentStatus'],
          price: Number(purchase.unitPrice || 0),
          quantity: Number(purchase.quantity || 0),
          paid,
          totalPrice,
          due: totalPrice - paid,
          date: formatDate(purchaseDate, language),
          createdAt: purchaseDate,
        };
      }) ?? []
    );
  }, [data?.data, language]);

  const summary = useMemo(
    () => ({
      total: Number(data?.summary?.totalPurchases || 0),
      paid: Number(data?.summary?.totalPayments || 0),
      due: Number(data?.summary?.remaining || 0),
    }),
    [data?.summary],
  );

  const sellerOptions =
    sellerData?.data?.map((seller: { _id: string; name: string }) => ({
      value: seller._id,
      label: seller.name,
    })) ?? [];

  const columns: TableColumnsType<PurchaseRow> = [
    {
      title: t('productName'),
      key: 'productName',
      dataIndex: 'productName',
      width: 180,
      ellipsis: true,
      render: (value) => <strong>{value}</strong>,
    },
    {
      title: t('sellerName'),
      key: 'sellerName',
      dataIndex: 'sellerName',
      width: 150,
      ellipsis: true,
      render: (value) => <Tag color='cyan'>{value || t('unknown')}</Tag>,
    },
    {
      title: t('quantity'),
      key: 'quantity',
      dataIndex: 'quantity',
      align: 'center',
      width: 95,
      render: (value) => formatNumber(value),
    },
    {
      title: t('unitPrice'),
      key: 'price',
      dataIndex: 'price',
      align: 'center',
      width: 130,
      render: (value) => <span className='purchase-money'>{formatMoney(value)}</span>,
    },
    {
      title: t('totalPrice'),
      key: 'totalPrice',
      dataIndex: 'totalPrice',
      align: 'center',
      width: 130,
      render: (value) => <span className='purchase-money'>{formatMoney(value)}</span>,
    },
    {
      title: t('paidAmount'),
      key: 'paid',
      dataIndex: 'paid',
      align: 'center',
      width: 130,
      render: (value) => <span className='purchase-money'>{formatMoney(value)}</span>,
    },
    {
      title: t('due'),
      key: 'due',
      dataIndex: 'due',
      align: 'center',
      width: 130,
      render: (value) => (
        <Tag color={value > 0 ? 'error' : 'success'} className='purchase-due-tag'>
          {formatMoney(value)}
        </Tag>
      ),
    },
    {
      title: t('paymentStatus'),
      key: 'paymentStatus',
      dataIndex: 'paymentStatus',
      align: 'center',
      width: 140,
      render: (value: PurchaseRow['paymentStatus']) => (
        <Tag color={paymentStatusColor[value] || 'default'} className='purchase-status-tag'>
          {t(paymentStatusKey[value] || 'pendingStatus')}
        </Tag>
      ),
    },
    {
      title: t('date'),
      key: 'date',
      dataIndex: 'date',
      align: 'center',
      width: 135,
    },
    {
      title: t('action'),
      key: 'x',
      align: 'center',
      render: (item) => {
        return (
          <Flex gap={8} className='table-actions purchase-table-actions' justify='center' wrap>
            <Button
              size='middle'
              type='primary'
              className='btn-role-pay'
              icon={<DollarOutlined />}
              onClick={() => setPaySeller({ id: item.sellerId, name: item.sellerName })}
            >
              {t('paySeller')}
            </Button>
            <Button
              size='middle'
              type='primary'
              className='btn-role-view'
              icon={<FileTextOutlined />}
              onClick={() => setDetailPurchase(item)}
            >
              {t('view')}
            </Button>
            <DeleteModal id={item.key} />
          </Flex>
        );
      },
      width: 270,
    },
  ];

  return (
    <div className='purchase-page page-fade-in'>
      <div className='purchase-page-header'>
        <div>
          <span>{t('purchasePageSubtitle')}</span>
          <h1>{t('purchases')}</h1>
          <p>{t('purchasePageDescription')}</p>
        </div>
        <ShopOutlined />
      </div>

      <div className='purchase-action-bar'>
        <Button type='primary' size='large' className='btn-role-add purchase-medicine-button' onClick={() => setPurchaseModalOpen(true)}>
          {t('purchaseMedicine')}
        </Button>
      </div>

      <div className='purchase-toolbar'>
        <Row gutter={[12, 12]} align='middle'>
          <Col xs={24} sm={12} lg={7}>
            <SearchInput
              placeholder={t('searchPurchase')}
              setQuery={(updater) => {
                setQuery((prev) => {
                  const next = typeof updater === 'function'
                    ? updater({ page: prev.page, limit: prev.limit, search: prev.search })
                    : updater;
                  return { ...prev, page: next.page, limit: next.limit, search: next.search };
                });
              }}
              value={searchInput}
              onChange={setSearchInput}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Select
              allowClear
              size='large'
              className='purchase-filter-control'
              placeholder={t('selectSeller')}
              value={sellerFilter}
              options={sellerOptions}
              onChange={(value) => {
                setSellerFilter(value);
                setQuery((prev) => ({ ...prev, page: 1, seller: value }));
              }}
            />
          </Col>
          <Col xs={24} sm={12} lg={7}>
            <RangePicker
              key={rangePickerKey}
              size='large'
              className='purchase-filter-control'
              suffixIcon={<CalendarOutlined />}
              onChange={(_, dateStrings) => {
                setQuery((prev) => ({
                  ...prev,
                  page: 1,
                  startDate: dateStrings[0] || undefined,
                  endDate: dateStrings[1] || undefined,
                }));
              }}
            />
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Button className='btn-role-neutral' onClick={clearFilters} block>
              {t('clearFilters')}
            </Button>
          </Col>
        </Row>
      </div>

      <Row gutter={[14, 14]} className='purchase-summary-row'>
        <Col xs={24} md={8}>
          <div className='purchase-summary-card is-total'>
            <Statistic title={t('totalPurchases')} value={formatMoney(summary.total)} />
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className='purchase-summary-card is-paid'>
            <Statistic title={t('totalPayments')} value={formatMoney(summary.paid)} />
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className='purchase-summary-card is-due'>
            <Statistic title={t('dueAmount')} value={formatMoney(summary.due)} />
          </div>
        </Col>
      </Row>

      <div className='purchase-table-card'>
        <Table
          size='middle'
          loading={isFetching}
          columns={columns}
          dataSource={tableData}
          pagination={false}
          scroll={{ x: 1220 }}
        />
      </div>

      <Flex justify='center' className='purchase-pagination'>
        <Pagination
          current={query.page}
          onChange={onChange}
          defaultPageSize={query.limit}
          total={data?.meta?.total}
        />
      </Flex>

      <PurchaseDetailModal
        purchase={detailPurchase}
        language={language}
        onClose={() => setDetailPurchase(null)}
      />

      <SellerPayModal
        open={!!paySeller}
        sellerId={paySeller?.id ?? null}
        sellerName={paySeller?.name ?? ''}
        onClose={() => setPaySeller(null)}
      />
      <PurchaseMedicineModal
        open={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        products={productData?.data || []}
        sellers={sellerData?.data || []}
        language={language}
      />
    </div>
  );
};

const PurchaseMedicineModal = ({
  open,
  onClose,
  products,
  sellers,
  language,
}: {
  open: boolean;
  onClose: () => void;
  products: Array<{ _id: string; name: string; purchasePrice?: number; price?: number; seller?: string | { _id: string } }>;
  sellers: Array<{ _id: string; name: string }>;
  language: Language;
}) => {
  const { t } = useLanguage();
  const [form] = Form.useForm();
  const [createPurchase, { isLoading }] = useCreatePurchaseMutation();

  const selectedProductId = Form.useWatch('product', form);
  const watchedQuantity = Form.useWatch('quantity', form);
  const watchedUnitPrice = Form.useWatch('unitPrice', form);
  const watchedPaid = Form.useWatch('paid', form);
  const selectedProduct = products.find((product) => product._id === selectedProductId);
  const previewQuantity = parseLocalizedNumber(watchedQuantity, 0);
  const previewUnitPrice = parseLocalizedNumber(watchedUnitPrice, 0);
  const previewPaid = parseLocalizedNumber(watchedPaid, 0);
  const previewTotal = previewQuantity * previewUnitPrice;
  const previewBalance = previewTotal - previewPaid;
  const previewStatus: PurchaseRow['paymentStatus'] = previewPaid >= previewTotal && previewTotal > 0
    ? 'PAID'
    : previewPaid > 0
      ? 'PARTIAL'
      : 'UNPAID';

  const submit = async (values: any) => {
    const product = products.find((item) => item._id === values.product);
    const seller = sellers.find((item) => item._id === values.seller);
    const quantity = parseLocalizedNumber(values.quantity, 0);
    const unitPrice = parseLocalizedNumber(values.unitPrice, 0);
    const paid = parseLocalizedNumber(values.paid, 0);

    try {
      const res = await createPurchase({
        product: values.product,
        productName: product?.name,
        seller: values.seller,
        sellerName: seller?.name,
        quantity,
        unitPrice,
        paid,
        purchaseDate: values.purchaseDate?.toISOString?.() || values.purchaseDate,
      }).unwrap();
      toastMessage({ icon: 'success', text: res.message });
      form.resetFields();
      onClose();
    } catch (error: any) {
      toastMessage({ icon: 'error', text: error.data?.message || 'Purchase failed' });
    }
  };

  return (
    <Modal title={t('purchaseMedicine')} open={open} onCancel={onClose} footer={null} width={760}>
      <Form
        form={form}
        layout='vertical'
        onFinish={submit}
        initialValues={{ paid: 0 }}
      >
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item name='product' label={t('medicineName')} rules={[{ required: true }]}>
              <Select
                showSearch
                optionFilterProp='label'
                options={products.map((product) => ({ value: product._id, label: product.name }))}
                onChange={(value) => {
                  const product = products.find((item) => item._id === value);
                  form.setFieldsValue({
                    unitPrice: product?.purchasePrice || product?.price || 0,
                  });
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name='seller' label={t('sellerName')} rules={[{ required: true }]}>
              <Select showSearch optionFilterProp='label' options={sellers.map((seller) => ({ value: seller._id, label: seller.name }))} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name='quantity' label={t('quantity')} rules={[{ required: true }]}>
              <InputNumber min={1} parser={inputNumberParser} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name='unitPrice' label={t('unitPrice')} rules={[{ required: true }]}>
              <InputNumber min={0} parser={inputNumberParser} style={{ width: '100%' }} addonAfter={getCurrencyAddonByLanguage(language)} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name='paid'
              label={t('paidAmount')}
              rules={[
                { required: true },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const paidValue = parseLocalizedNumber(value, 0);
                    const totalValue = parseLocalizedNumber(getFieldValue('quantity'), 0) * parseLocalizedNumber(getFieldValue('unitPrice'), 0);
                    if (paidValue <= totalValue) return Promise.resolve();
                    return Promise.reject(new Error(t('paidAmount')));
                  },
                }),
              ]}
            >
              <InputNumber min={0} parser={inputNumberParser} style={{ width: '100%' }} addonAfter={getCurrencyAddonByLanguage(language)} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name='purchaseDate' label={t('date')} rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        {selectedProduct && (
          <p className='purchase-selected-medicine'>
            {selectedProduct.name}
          </p>
        )}
        <Row gutter={[12, 12]} className='purchase-calculation-preview'>
          <Col xs={24} md={8}>
            <Statistic title={t('totalPrice')} value={formatCurrencyByLanguage(previewTotal, language)} />
          </Col>
          <Col xs={24} md={8}>
            <Statistic title={t('dueAmount')} value={formatCurrencyByLanguage(previewBalance, language)} />
          </Col>
          <Col xs={24} md={8}>
            <Statistic title={t('paymentStatus')} value={t(paymentStatusKey[previewStatus])} />
          </Col>
        </Row>
        <Flex justify='flex-end' gap={10}>
          <Button onClick={onClose} className='btn-role-neutral'>{t('cancel')}</Button>
          <Button htmlType='submit' type='primary' className='btn-role-add' loading={isLoading}>
            {t('submit')}
          </Button>
        </Flex>
      </Form>
    </Modal>
  );
};

const PurchaseDetailModal = ({
  purchase,
  language,
  onClose,
}: {
  purchase: PurchaseRow | null;
  language: Language;
  onClose: () => void;
}) => {
  const { t } = useLanguage();
  const formatNumber = (value: number) => formatNumberByLanguage(value, language);
  const formatMoney = (value: number) => formatCurrencyByLanguage(value, language);

  return (
    <Modal
      title={t('purchaseDetails')}
      open={!!purchase}
      onCancel={onClose}
      footer={[
        <Button key='close' className='btn-role-neutral' onClick={onClose}>
          {t('close')}
        </Button>,
      ]}
      width={760}
      className='purchase-detail-modal'
    >
      {purchase && (
        <Descriptions bordered column={{ xs: 1, sm: 2 }} size='middle'>
          <Descriptions.Item label={t('sellerName')}>{purchase.sellerName}</Descriptions.Item>
          <Descriptions.Item label={t('productName')}>{purchase.productName}</Descriptions.Item>
          <Descriptions.Item label={t('unitPrice')}>
            {formatMoney(purchase.price)}
          </Descriptions.Item>
          <Descriptions.Item label={t('quantity')}>
            {formatNumber(purchase.quantity)}
          </Descriptions.Item>
          <Descriptions.Item label={t('paidAmount')}>
            {formatMoney(purchase.paid)}
          </Descriptions.Item>
          <Descriptions.Item label={t('dueAmount')}>
            {formatMoney(purchase.due)}
          </Descriptions.Item>
          <Descriptions.Item label={t('paymentStatus')}>
            <Tag color={paymentStatusColor[purchase.paymentStatus]}>
              {t(paymentStatusKey[purchase.paymentStatus])}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('totalPrice')}>
            {formatMoney(purchase.totalPrice)}
          </Descriptions.Item>
          <Descriptions.Item label={t('date')}>{purchase.date}</Descriptions.Item>
        </Descriptions>
      )}
    </Modal>
  );
};

const DeleteModal = ({ id }: { id: string }) => {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletePurchase] = useDeletePurchaseMutation();

  const handleDelete = async (purchaseId: string) => {
    try {
      const res = await deletePurchase(purchaseId).unwrap();
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
        icon={<DeleteFilled />}
      />
      <Modal title={t('deleteTitle')} open={isModalOpen} onCancel={handleCancel} footer={null}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>{t('deleteQuestion')}</h2>
          <h4>{t('deleteWarning')}</h4>
          <div
            style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}
          >
            <Button onClick={handleCancel} type='primary' className='btn-role-neutral'>
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

export default PurchaseManagementPage;
