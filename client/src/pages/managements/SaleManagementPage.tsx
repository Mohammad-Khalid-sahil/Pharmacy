import {
  CalendarOutlined,
  DeleteFilled,
  FileTextOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import type { PaginationProps, TableColumnsType } from 'antd';
import {
  Button,
  Col,
  DatePicker,
  Descriptions,
  Flex,
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
import SaleReturnHistoryTable from '../../components/sale/SaleReturnHistoryTable';
import SaleReturnModal, { SaleRowForReturn } from '../../components/sale/SaleReturnModal';
import { Language, useLanguage } from '../../i18n/LanguageContext';
import toastMessage from '../../lib/toastMessage';
import { useDeleteSaleMutation, useGetAllSaleQuery, useGetSalesByTransactionQuery } from '../../redux/features/management/saleApi';
import { ITableSale } from '../../types/sale.type';
import { PaymentType } from '../../types/salePayment.type';
import formatDate from '../../utils/formatDate';
import { formatCurrencyByLanguage, formatNumberByLanguage } from '../../utils/formatters';

const { RangePicker } = DatePicker;

type SaleRow = {
  key: string;
  productName: string;
  productId: string;
  productPrice: number;
  buyerName: string;
  quantity: number;
  paidAmount: number;
  dueAmount: number;
  totalPrice: number;
  profit: number;
  paymentType: PaymentType;
  date: string;
  rawDate: string;
  customer?: string;
  transactionId?: string;
};

const resolvePaymentType = (sale: ITableSale): PaymentType => {
  if (sale.paymentType) return sale.paymentType;
  if (Number(sale.dueAmount || 0) > 0 && Number(sale.paidAmount || 0) > 0) return 'PARTIAL';
  if (Number(sale.dueAmount || 0) > 0) return 'CREDIT';
  return 'CASH';
};

const SaleManagementPage = () => {
  const { t, language } = useLanguage();
  const formatNumber = (value: number) => formatNumberByLanguage(value, language);
  const formatMoney = (value: number) => formatCurrencyByLanguage(value, language);
  const [query, setQuery] = useState({
    page: 1,
    limit: 10,
    search: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentType | undefined>();
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});
  const [rangePickerKey, setRangePickerKey] = useState(0);
  const [returnSale, setReturnSale] = useState<SaleRowForReturn | null>(null);
  const [detailSale, setDetailSale] = useState<SaleRow | null>(null);

  const { data, isFetching, refetch } = useGetAllSaleQuery(query);

  const onChange: PaginationProps['onChange'] = (page) => {
    setQuery((prev) => ({ ...prev, page }));
  };

  const clearFilters = () => {
    setSearchInput('');
    setPaymentFilter(undefined);
    setDateRange({});
    setRangePickerKey((prev) => prev + 1);
    setQuery((prev) => ({ ...prev, page: 1, search: '' }));
  };

  const tableData = useMemo<SaleRow[]>(() => {
    return (
      data?.data?.map((sale: ITableSale) => {
        const paymentType = resolvePaymentType(sale);
        const totalPrice = Number(sale.totalPrice || 0);
        const paidAmount = Number(
          sale.paidAmount ?? (paymentType === 'CREDIT' ? 0 : totalPrice - Number(sale.dueAmount || 0)),
        );
        const dueAmount = Number(sale.dueAmount ?? Math.max(totalPrice - paidAmount, 0));

        return {
          key: sale._id,
          productName: sale.productName,
          productId: sale.product?._id || '',
          productPrice: Number(sale.productPrice || 0),
          buyerName: sale.buyerName,
          quantity: Number(sale.quantity || 0),
          paidAmount,
          dueAmount,
          totalPrice,
          profit: Number(sale.profit || 0),
          paymentType,
          date: formatDate(sale.date, language),
          rawDate: sale.date,
          customer: typeof sale.customer === 'string' ? sale.customer : sale.customer?._id,
          transactionId: typeof sale.transactionId === 'string' ? sale.transactionId : sale.transactionId?._id,
        };
      }) ?? []
    );
  }, [data?.data]);

  const filteredTableData = useMemo(() => {
    return tableData.filter((sale) => {
      const matchesPayment = paymentFilter ? sale.paymentType === paymentFilter : true;
      const saleTime = new Date(sale.rawDate).getTime();
      const matchesStart = dateRange.start
        ? saleTime >= new Date(dateRange.start).setHours(0, 0, 0, 0)
        : true;
      const matchesEnd = dateRange.end
        ? saleTime <= new Date(dateRange.end).setHours(23, 59, 59, 999)
        : true;

      return matchesPayment && matchesStart && matchesEnd;
    });
  }, [dateRange.end, dateRange.start, paymentFilter, tableData]);

  const summary = useMemo(
    () =>
      filteredTableData.reduce(
        (acc, sale) => ({
          revenue: acc.revenue + sale.totalPrice,
          profit: acc.profit + sale.profit,
          due: acc.due + sale.dueAmount,
        }),
        { revenue: 0, profit: 0, due: 0 },
      ),
    [filteredTableData],
  );

  const paymentOptions = [
    { value: 'CASH', label: t('cashSale') },
    { value: 'CREDIT', label: t('creditSale') },
    { value: 'PARTIAL', label: t('partialSale') },
  ];

  const renderPaymentTag = (paymentType: PaymentType) => {
    const color = paymentType === 'CASH' ? 'success' : paymentType === 'PARTIAL' ? 'warning' : 'error';
    const label =
      paymentType === 'CASH' ? t('cashSale') : paymentType === 'PARTIAL' ? t('partialSale') : t('creditSale');

    return (
      <Tag color={color} className='sale-payment-tag'>
        {label}
      </Tag>
    );
  };

  const columns: TableColumnsType<SaleRow> = [
    {
      title: t('productName'),
      key: 'productName',
      dataIndex: 'productName',
      width: 180,
      ellipsis: true,
      render: (value) => <strong>{value}</strong>,
    },
    {
      title: t('buyerName'),
      key: 'buyerName',
      dataIndex: 'buyerName',
      align: 'center',
      width: 150,
      ellipsis: true,
      render: (value, row) => (
        <div className='sale-customer-cell'>
          <strong>{value}</strong>
          {row.customer && <span>{t('customers')}</span>}
        </div>
      ),
    },
    {
      title: t('paymentType'),
      key: 'paymentType',
      dataIndex: 'paymentType',
      align: 'center',
      width: 130,
      render: renderPaymentTag,
    },
    {
      title: t('salePrice'),
      key: 'productPrice',
      dataIndex: 'productPrice',
      align: 'center',
      width: 130,
      render: (value) => <span className='sale-money'>{formatMoney(value)}</span>,
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
      title: t('totalPrice'),
      key: 'totalPrice',
      dataIndex: 'totalPrice',
      align: 'center',
      width: 130,
      render: (value) => <span className='sale-money'>{formatMoney(value)}</span>,
    },
    {
      title: t('dueAmount'),
      key: 'dueAmount',
      dataIndex: 'dueAmount',
      align: 'center',
      width: 130,
      render: (value) => (
        <Tag color={value > 0 ? 'error' : 'success'} className='sale-due-tag'>
          {formatMoney(value)}
        </Tag>
      ),
    },
    {
      title: t('profit'),
      key: 'profit',
      dataIndex: 'profit',
      align: 'center',
      width: 120,
      render: (value) => <span className='sale-money sale-profit'>{formatMoney(value)}</span>,
    },
    { title: t('sellingDate'), key: 'date', dataIndex: 'date', align: 'center', width: 135 },
    {
      title: t('action'),
      key: 'x',
      align: 'center',
      render: (_, item) => (
        <Flex gap={8} className='table-actions sale-table-actions' justify='center' wrap>
          <Button
            type='primary'
            size='middle'
            className='btn-role-return'
            icon={<RollbackOutlined />}
            onClick={() =>
              setReturnSale({
                key: item.key,
                productName: item.productName,
                productId: item.productId,
                quantity: item.quantity,
                productPrice: item.productPrice,
                totalPrice: item.totalPrice,
                buyerName: item.buyerName,
                date: item.rawDate || item.date,
                customer: item.customer,
              })
            }
          >
            {t('returnSale')}
          </Button>
          <Button
            type='primary'
            size='middle'
            className='btn-role-view'
            icon={<FileTextOutlined />}
            onClick={() => setDetailSale(item)}
          >
            {t('view')}
          </Button>
          <DeleteModal id={item.key} onDeleted={refetch} />
        </Flex>
      ),
      width: 300,
    },
  ];

  return (
    <div className='sale-page page-fade-in'>
      <div className='sale-page-header'>
        <div>
          <span>{t('salePageSubtitle')}</span>
          <h1>{t('sales')}</h1>
          <p>{t('salePageDescription')}</p>
        </div>
      </div>

      <div className='sale-toolbar'>
        <Row gutter={[12, 12]} align='middle'>
          <Col xs={24} sm={12} lg={6}>
            <SearchInput
              placeholder={t('searchSoldProducts')}
              setQuery={setQuery}
              value={searchInput}
              onChange={setSearchInput}
            />
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Select
              allowClear
              size='large'
              className='sale-filter-control'
              placeholder={t('allPaymentTypes')}
              value={paymentFilter}
              options={paymentOptions}
              onChange={setPaymentFilter}
            />
          </Col>
          <Col xs={24} sm={12} lg={7}>
            <RangePicker
              key={rangePickerKey}
              size='large'
              className='sale-filter-control'
              suffixIcon={<CalendarOutlined />}
              onChange={(_, dateStrings) =>
                setDateRange({ start: dateStrings[0] || undefined, end: dateStrings[1] || undefined })
              }
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Button className='btn-role-neutral' onClick={clearFilters} block>
              {t('clearFilters')}
            </Button>
          </Col>
        </Row>
      </div>

      <Row gutter={[14, 14]} className='sale-summary-row'>
        <Col xs={24} md={8}>
          <div className='sale-summary-card is-revenue'>
            <Statistic title={t('totalRevenueLabel')} value={formatMoney(summary.revenue)} />
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className='sale-summary-card is-profit'>
            <Statistic title={t('profit')} value={formatMoney(summary.profit)} />
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className='sale-summary-card is-due'>
            <Statistic title={t('dueAmount')} value={formatMoney(summary.due)} />
          </div>
        </Col>
      </Row>

      <div className='sale-table-card'>
        <Table
          size='middle'
          loading={isFetching}
          columns={columns}
          dataSource={filteredTableData}
          pagination={false}
          rowKey='key'
          scroll={{ x: 1300 }}
        />
      </div>

      <Flex justify='center' className='sale-pagination'>
        <Pagination
          current={query.page}
          onChange={onChange}
          defaultPageSize={query.limit}
          total={data?.meta?.total}
        />
      </Flex>

      <div className='sale-return-history-card'>
        <SaleReturnHistoryTable />
      </div>

      <SaleDetailModal
        sale={detailSale}
        language={language}
        renderPaymentTag={renderPaymentTag}
        onClose={() => setDetailSale(null)}
      />

      <SaleReturnModal
        sale={returnSale}
        open={!!returnSale}
        onClose={() => setReturnSale(null)}
        onReturned={refetch}
      />
    </div>
  );
};

const SaleDetailModal = ({
  sale,
  language,
  renderPaymentTag,
  onClose,
}: {
  sale: SaleRow | null;
  language: Language;
  renderPaymentTag: (paymentType: PaymentType) => JSX.Element;
  onClose: () => void;
}) => {
  const { t } = useLanguage();
  const formatNumber = (value: number) => formatNumberByLanguage(value, language);
  const formatMoney = (value: number) => formatCurrencyByLanguage(value, language);
  const { data: transactionData, isFetching: isTransactionLoading } = useGetSalesByTransactionQuery(sale?.transactionId || '', {
    skip: !sale?.transactionId,
  });

  const groupItems = sale?.transactionId
    ? ((transactionData?.data as any[] | undefined) || []).map((item) => ({
        key: item._id,
        productName: item.productName,
        productPrice: Number(item.productPrice || 0),
        quantity: Number(item.quantity || 0),
        paidAmount: Number(item.paidAmount || 0),
        dueAmount: Number(item.dueAmount || 0),
        totalPrice: Number(item.totalPrice || 0),
      }))
    : [];

  const saleItems: any[] = sale?.transactionId && groupItems.length > 0 ? groupItems : sale ? [sale] : [];

  const totalAmount = saleItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalQuantity = saleItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPaid = saleItems.reduce((sum, item) => sum + item.paidAmount, 0);
  const totalDue = saleItems.reduce((sum, item) => sum + item.dueAmount, 0);

  const itemColumns = [
    { title: t('productName'), dataIndex: 'productName', key: 'productName' },
    {
      title: t('salePrice'),
      dataIndex: 'productPrice',
      key: 'productPrice',
      render: (value: number) => <span className='sale-money'>{formatMoney(value)}</span>,
    },
    {
      title: t('quantity'),
      dataIndex: 'quantity',
      key: 'quantity',
      render: (value: number) => formatNumber(value),
    },
    {
      title: t('subtotal'),
      key: 'subtotal',
      render: (_: any, row: any) => <span className='sale-money'>{formatMoney(row.productPrice * row.quantity)}</span>,
    },
  ];

  return (
    <Modal
      title={t('saleDetails')}
      open={!!sale}
      onCancel={onClose}
      footer={[
        <Button key='close' className='btn-role-neutral' onClick={onClose}>
          {t('close')}
        </Button>,
      ]}
      width={900}
      className='sale-detail-modal'
    >
      {sale && (
        <>
          <Descriptions bordered column={{ xs: 1, sm: 2 }} size='middle'>
            <Descriptions.Item label={t('buyerName')}>{sale.buyerName}</Descriptions.Item>
            <Descriptions.Item label={t('paymentType')}>{renderPaymentTag(sale.paymentType)}</Descriptions.Item>
            <Descriptions.Item label={t('paidAmount')}>{formatMoney(totalPaid)}</Descriptions.Item>
            <Descriptions.Item label={t('dueAmount')}>{formatMoney(totalDue)}</Descriptions.Item>
            <Descriptions.Item label={t('totalPrice')}>{formatMoney(totalAmount)}</Descriptions.Item>
            <Descriptions.Item label={t('totalQuantity')}>{formatNumber(totalQuantity)}</Descriptions.Item>
            <Descriptions.Item label={t('sellingDate')}>{sale.date}</Descriptions.Item>
          </Descriptions>

          <div style={{ marginTop: '1rem' }}>
            <Table
              size='middle'
              dataSource={saleItems}
              columns={itemColumns}
              rowKey='key'
              pagination={false}
              loading={isTransactionLoading}
            />
          </div>
        </>
      )}
    </Modal>
  );
};

const DeleteModal = ({ id, onDeleted }: { id: string; onDeleted?: () => void }) => {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteSale] = useDeleteSaleMutation();

  const handleCancel = () => setIsModalOpen(false);

  const handleDelete = async () => {
    try {
      const res = await deleteSale(id).unwrap();
      if (res.statusCode === 200) {
        toastMessage({ icon: 'success', text: res.message });
        handleCancel();
        onDeleted?.();
      }
    } catch (error: any) {
      handleCancel();
      toastMessage({ icon: 'error', text: error.data.message });
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        type='primary'
        size='small'
        className='table-btn-small btn-role-delete'
        icon={<DeleteFilled />}
      />
      <Modal title={t('deleteTitle')} open={isModalOpen} onCancel={handleCancel} footer={null}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>{t('deleteQuestion')}</h2>
          <h4>{t('deleteWarning')}</h4>
          <Flex gap='1rem' justify='center' style={{ marginTop: '1rem' }}>
            <Button onClick={handleCancel} type='primary' className='btn-role-neutral'>
              {t('cancel')}
            </Button>
            <Button onClick={handleDelete} type='primary' className='btn-role-delete'>
              {t('confirmDelete')}
            </Button>
          </Flex>
        </div>
      </Modal>
    </>
  );
};

export default SaleManagementPage;
