import { DeleteOutlined } from '@ant-design/icons';
import { Button, Flex, Pagination, Table } from 'antd';
import { useState } from 'react';
import { useDeleteSaleReturnMutation, useGetSaleReturnsQuery } from '../../redux/features/management/saleReturnApi';
import formatDate from '../../utils/formatDate';
import { useLanguage } from '../../i18n/LanguageContext';
import SaleReturnDetailModal from './SaleReturnDetailModal';
import { ISaleReturn } from '../../types/saleReturn.types';
import { formatCurrencyByLanguage } from '../../utils/formatters';
import toastMessage from '../../lib/toastMessage';

const SaleReturnHistoryTable = () => {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState({ page: 1, limit: 10 });
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isFetching, refetch } = useGetSaleReturnsQuery(query);
  const [deleteSaleReturn] = useDeleteSaleReturnMutation();

  const confirmDeleteReturn = async (row: ISaleReturn) => {
    const result = await toastMessage({
      icon: 'warning',
      title: t('deleteTitle'),
      text: `${t('deleteQuestion')} ${t('deleteWarning')}`,
      showCancelButton: true,
      confirmButtonText: t('confirmDelete'),
      cancelButtonText: t('cancel'),
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      const res = await deleteSaleReturn(row._id).unwrap();
      toastMessage({ icon: 'success', text: res.message || 'Deleted successfully' });
      refetch();
    } catch (error: any) {
      toastMessage({ icon: 'error', text: error?.data?.message || t('failed') });
    }
  };

  const columns = [
    {
      title: t('date'),
      key: 'date',
      render: (_: unknown, row: ISaleReturn) => formatDate(row.createdAt || '', language),
    },
    {
      title: t('productName'),
      key: 'sale',
      render: (_: unknown, row: ISaleReturn) => {
        const s = row.sale;
        if (typeof s === 'object' && s?.productName) return s.productName;
        return row.productName || row.items?.map((item) => item.product).filter(Boolean).join(', ') || '-';
      },
    },
    {
      title: t('quantity'),
      key: 'qty',
      align: 'center' as const,
      render: (_: unknown, row: ISaleReturn) => row.quantity || row.items?.reduce((a, i) => a + i.quantity, 0),
    },
    {
      title: t('buyerName'),
      key: 'customer',
      render: (_: unknown, row: ISaleReturn) => {
        if (typeof row.customer === 'object' && row.customer?.name) return row.customer.name;
        return row.customerName || (typeof row.sale === 'object' ? row.sale?.buyerName : '-') || '-';
      },
    },
    { title: t('totalRefund'), dataIndex: 'totalRefund', key: 'totalRefund', align: 'center' as const, render: (v: number) => formatCurrencyByLanguage(v, language) },
    { title: t('reason'), dataIndex: 'reason', key: 'reason', render: (v: string) => v || '-' },
    {
      title: t('action'),
      key: 'action',
      render: (_: unknown, row: ISaleReturn) => (
        <Flex
          className='table-actions sale-table-actions'
          align='center'
          gap={8}
          style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}
        >
          <Button size='small' className='btn-role-view' onClick={() => setDetailId(row._id)}>
            {t('view')}
          </Button>
          <Button
            size='small'
            className='btn-role-delete'
            icon={<DeleteOutlined />}
            onClick={() => confirmDeleteReturn(row)}
          >
            {t('delete')}
          </Button>
        </Flex>
      ),
    },
  ];

  return (
    <div className='panel' style={{ marginTop: '1.5rem' }}>
      <h2>{t('returnHistory')}</h2>
      <Table size='small' loading={isFetching} columns={columns} dataSource={data?.data || []} rowKey='_id' pagination={false} />
      <Flex justify='center' style={{ marginTop: '1rem' }}>
        <Pagination
          current={query.page}
          pageSize={query.limit}
          total={data?.meta?.total || 0}
          onChange={(page) => setQuery((prev) => ({ ...prev, page }))}
        />
      </Flex>
      <SaleReturnDetailModal returnId={detailId} open={!!detailId} onClose={() => setDetailId(null)} />
    </div>
  );
};

export default SaleReturnHistoryTable;
