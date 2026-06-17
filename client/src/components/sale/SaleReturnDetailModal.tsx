import { Descriptions, Modal, Table } from 'antd';
import { useGetSaleReturnQuery } from '../../redux/features/management/saleReturnApi';
import formatDate from '../../utils/formatDate';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatCurrencyByLanguage, formatNumberByLanguage } from '../../utils/formatters';

const SaleReturnDetailModal = ({
  returnId,
  open,
  onClose,
}: {
  returnId: string | null;
  open: boolean;
  onClose: () => void;
}) => {
  const { t, language } = useLanguage();
  const { data, isFetching } = useGetSaleReturnQuery(returnId!, { skip: !returnId || !open });

  const record = data?.data;
  const saleInfo =
    record?.sale && typeof record.sale === 'object'
      ? record.sale
      : null;

  return (
    <Modal title={t('returnDetails')} open={open} onCancel={onClose} footer={null} width={640}>
      {isFetching ? (
        <p>{t('loading')}</p>
      ) : (
        <>
          <Descriptions bordered size='small' column={1} style={{ marginBottom: '1rem' }}>
            <Descriptions.Item label={t('productName')}>
              {saleInfo?.productName || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('buyerName')}>{saleInfo?.buyerName || '-'}</Descriptions.Item>
            <Descriptions.Item label={t('totalRefund')}>{formatCurrencyByLanguage(record?.totalRefund, language)}</Descriptions.Item>
            <Descriptions.Item label={t('reason')}>{record?.reason || '-'}</Descriptions.Item>
            <Descriptions.Item label={t('note')}>{record?.note || '-'}</Descriptions.Item>
            <Descriptions.Item label={t('date')}>
              {record?.createdAt ? formatDate(record.createdAt, language) : '-'}
            </Descriptions.Item>
          </Descriptions>
          <Table
            size='small'
            pagination={false}
            rowKey={(_, i) => String(i)}
            dataSource={record?.items || []}
            columns={[
              {
                title: t('productName'),
                key: 'product',
                render: () => saleInfo?.productName || '-',
              },
              { title: t('quantity'), dataIndex: 'quantity', key: 'quantity', render: (v: number) => formatNumberByLanguage(v, language) },
              { title: t('refundAmount'), dataIndex: 'refundAmount', key: 'refundAmount', render: (v: number) => formatCurrencyByLanguage(v, language) },
            ]}
          />
        </>
      )}
    </Modal>
  );
};

export default SaleReturnDetailModal;
