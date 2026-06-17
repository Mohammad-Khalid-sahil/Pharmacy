import { AlertOutlined, ClockCircleOutlined, DeleteOutlined, MedicineBoxOutlined } from '@ant-design/icons';
import { Button, Col, Flex, Row, Statistic, Table, Tag, TableColumnsType, message } from 'antd';
import { useMemo, useState } from 'react';
import {
  useGetAllProductsQuery,
  useGetExpiringAlertsQuery,
  useGetLowStockAlertsQuery,
} from '../redux/features/management/productApi';
import { useBulkDeleteAlertsMutation } from '../redux/features/management/alertApi';
import { useLanguage } from '../i18n/LanguageContext';
import { formatDateByLanguage, formatNumberByLanguage } from '../utils/formatters';
import toastMessage from '../lib/toastMessage';

type AlertRow = {
  _id: string;
  alertKey: string;
  type: 'LOW_STOCK' | 'EXPIRED_MEDICINE';
  sourceId?: string;
  title: string;
  name?: string;
  stock?: number;
  minStock?: number;
  expireDate?: string;
};

const AlertsPage = () => {
  const { t, language } = useLanguage();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const { data: lowStock, isFetching: loadingLow, refetch: refetchLowStock } = useGetLowStockAlertsQuery(undefined);
  const { data: expiring, isFetching: loadingExp, refetch: refetchExpiring } = useGetExpiringAlertsQuery(30);
  const { data: allProducts } = useGetAllProductsQuery({ limit: 2000 });
  const [bulkDeleteAlerts, { isLoading: deleting }] = useBulkDeleteAlertsMutation();

  const isExpired = (date?: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const lowStockRows = useMemo<AlertRow[]>(() => (lowStock?.data || []).map((row: any) => ({
    ...row,
    _id: `low-stock:${row._id}`,
    alertKey: `LOW_STOCK:${row._id}`,
    type: 'LOW_STOCK',
    sourceId: row._id,
    title: row.name,
  })), [lowStock]);

  const expiringRows = useMemo<AlertRow[]>(() => (expiring?.data || []).map((row: any) => ({
    ...row,
    _id: `expiring-medicine:${row._id}`,
    alertKey: `EXPIRED_MEDICINE:${row._id}`,
    type: 'EXPIRED_MEDICINE',
    sourceId: row._id,
    title: row.name,
  })), [expiring]);

  const allRows = useMemo(() => [...lowStockRows, ...expiringRows], [lowStockRows, expiringRows]);

  const expiredCount = useMemo(
    () =>
      (allProducts?.data || []).filter(
        (product: { expireDate?: string }) => product.expireDate && isExpired(product.expireDate),
      ).length,
    [allProducts],
  );

  const refreshAlerts = async () => {
    await Promise.all([refetchLowStock(), refetchExpiring()]);
  };

  const confirmDelete = async () => {
    const result = await toastMessage({
      title: t('deleteQuestion'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('confirmDelete'),
      cancelButtonText: t('cancel'),
      reverseButtons: true,
    } as any);
    return Boolean((result as any)?.isConfirmed);
  };

  const deleteRows = async (rows: AlertRow[]) => {
    if (!rows.length) return;
    const confirmed = await confirmDelete();
    if (!confirmed) return;

    const dismissals = rows.map((row) => ({
      alertKey: row.alertKey,
      type: row.type,
      sourceId: row.sourceId,
      title: row.title,
    }));

    try {
      await bulkDeleteAlerts({ ids: [], dismissals }).unwrap();
      setSelectedRowKeys([]);
      await refreshAlerts();
      message.success(t('success'));
    } catch (_error) {
      message.error(t('failed'));
    }
  };

  const columns: TableColumnsType<AlertRow> = [
    { title: t('productName'), dataIndex: 'name', key: 'name', render: (value: string) => <strong>{value}</strong> },
    {
      title: t('stock'),
      dataIndex: 'stock',
      key: 'stock',
      render: (stock: number, row: { minStock?: number }) => (
        <Tag color={stock <= (row.minStock || 0) ? 'error' : 'success'}>{formatNumberByLanguage(stock, language)}</Tag>
      ),
    },
    { title: t('minStock'), dataIndex: 'minStock', key: 'minStock', render: (value: number) => <Tag color='warning'>{formatNumberByLanguage(value, language)}</Tag> },
    {
      title: t('expireDate'),
      dataIndex: 'expireDate',
      key: 'expireDate',
      render: (date: string) => (
        <Tag color={isExpired(date) ? 'error' : 'warning'}>
          {formatDateByLanguage(date, language)}
        </Tag>
      ),
    },
    {
      title: t('action'),
      key: 'action',
      align: 'center',
      render: (_value, row) => (
        <Button danger icon={<DeleteOutlined />} className='btn-alert-action' loading={deleting} onClick={() => deleteRows([row])}>
          {t('delete')}
        </Button>
      ),
    },
  ];

  const lowCount = lowStockRows.length;
  const selectedRows = allRows.filter((row) => selectedRowKeys.includes(row._id));
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  return (
    <div className='secondary-page alerts-page page-fade-in'>
      <Flex className='secondary-page-header alerts-page-header' justify='space-between' align='center' wrap='wrap' gap={16}>
        <div>
          <span>{t('alerts')}</span>
          <h1>{t('alerts')}</h1>
          <p>{t('lowStockAlerts')} / {t('expiringAlerts')}</p>
        </div>
        <AlertOutlined />
      </Flex>

      <Flex className='secondary-page-table-toolbar alerts-page-toolbar' justify='flex-end' align='center' wrap='wrap' gap={12}>
        <Button danger icon={<DeleteOutlined />} className='btn-alert-action' disabled={!selectedRows.length || deleting} loading={deleting} onClick={() => deleteRows(selectedRows)}>
          {t('deleteSelectedAlerts')}
        </Button>
        <Button danger icon={<DeleteOutlined />} className='btn-alert-action' disabled={!allRows.length || deleting} loading={deleting} onClick={() => deleteRows(allRows)}>
          {t('deleteAllAlerts')}
        </Button>
      </Flex>

      <Row gutter={[14, 14]} className='secondary-summary-row'>
        <Col xs={24} md={8}>
          <div className='secondary-summary-card is-warning'>
            <Statistic title={t('lowStockAlerts')} value={formatNumberByLanguage(lowCount, language)} prefix={<MedicineBoxOutlined />} />
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className='secondary-summary-card is-info'>
            <Statistic title={t('expiringAlerts')} value={formatNumberByLanguage(expiringRows.length, language)} prefix={<ClockCircleOutlined />} />
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className='secondary-summary-card is-danger'>
            <Statistic title={t('expiredMedicines')} value={formatNumberByLanguage(expiredCount, language)} prefix={<AlertOutlined />} />
          </div>
        </Col>
      </Row>

      <section className='alert-section alert-section--low secondary-table-card'>
        <Flex className='secondary-page-table-toolbar' justify='space-between' align='center'>
          <h2>{t('lowStockAlerts')}</h2>
        </Flex>
        <Table
          loading={loadingLow}
          columns={columns}
          dataSource={lowStockRows}
          rowKey='_id'
          rowSelection={rowSelection}
          pagination={false}
          rowClassName='alert-row--low'
          scroll={{ x: 760 }}
        />
      </section>
      <section className='alert-section alert-section--expiring secondary-table-card'>
        <Flex className='secondary-page-table-toolbar' justify='space-between' align='center'>
          <h2>{t('expiringAlerts')}</h2>
        </Flex>
        <Table
          loading={loadingExp}
          columns={columns}
          dataSource={expiringRows}
          rowKey='_id'
          rowSelection={rowSelection}
          pagination={false}
          rowClassName='alert-row--expiring'
          scroll={{ x: 760 }}
        />
      </section>
    </div>
  );
};

export default AlertsPage;
