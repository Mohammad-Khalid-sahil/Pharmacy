import { Descriptions, Modal, Table } from 'antd';
import { useGetPrescriptionQuery } from '../../redux/features/management/prescriptionApi';
import { useGetSalesByTransactionQuery } from '../../redux/features/management/saleApi';
import formatDate from '../../utils/formatDate';
import { useLanguage } from '../../i18n/LanguageContext';
import { IPrescriptionItem } from '../../types/prescription.types';
import { formatCurrencyByLanguage, formatNumberByLanguage } from '../../utils/formatters';

const PrescriptionDetailModal = ({
  prescriptionId,
  open,
  onClose,
}: {
  prescriptionId: string | null;
  open: boolean;
  onClose: () => void;
}) => {
  const { t, language } = useLanguage();
  const { data, isFetching } = useGetPrescriptionQuery(prescriptionId!, {
    skip: !prescriptionId || !open,
  });

  const record = data?.data;
  const saleInfo =
    record?.sale && typeof record.sale === 'object' ? record.sale : null;
  const { data: transactionData, isFetching: isLoadingSaleGroup } = useGetSalesByTransactionQuery(saleInfo?.transactionId || '', {
    skip: !saleInfo?.transactionId || !open,
  });
  const customerInfo =
    record?.customer && typeof record.customer === 'object' ? record.customer : null;
  const linkedSaleItems = saleInfo?.transactionId ? ((transactionData?.data as any[] | undefined) || []) : [];

  const productName = (item: IPrescriptionItem) => {
    if (item.productName || item.medicineName) return item.productName || item.medicineName;
    if (typeof item.product === 'object' && item.product?.name) return item.product.name;
    return '-';
  };

  const salePrice = (item: IPrescriptionItem) => {
    if (item.salePrice || item.sellingPrice) return Number(item.salePrice || item.sellingPrice);
    if (typeof item.product === 'object' && item.product?.price) return Number(item.product.price);
    return 0;
  };

  const subtotal = (item: IPrescriptionItem) => Number(item.subtotal || salePrice(item) * Number(item.quantity || 0));

  return (
    <Modal title={t('prescriptionDetails')} open={open} onCancel={onClose} footer={null} width={780} className='prescription-detail-modal'>
      {isFetching ? (
        <p>{t('loading')}</p>
      ) : (
        <>
          <Descriptions bordered size='small' column={1} style={{ marginBottom: '1rem' }}>
            <Descriptions.Item label={t('customerName')}>
              {record?.customerName || customerInfo?.name || record?.patientName || saleInfo?.buyerName || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('patientName')}>
              {record?.patientName || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('doctorName')}>{record?.doctorName || '-'}</Descriptions.Item>
            <Descriptions.Item label={t('note')}>{record?.note || '-'}</Descriptions.Item>
            <Descriptions.Item label={t('linkedSale')}>
              {record?.saleDeleted || record?.linkedSaleDeleted
                ? '-'
                : saleInfo?.transactionId
                ? `${saleInfo.buyerName || '-'} - ${formatNumberByLanguage(linkedSaleItems.length || record?.items?.length || 0, language)} ${t('items')}`
                : saleInfo?.productName
                  ? `${saleInfo.productName}${saleInfo.buyerName ? ` - ${saleInfo.buyerName}` : ''}`
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('selectCustomer')}>
              {customerInfo?.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('totalAmount')}>{formatCurrencyByLanguage(record?.totalAmount, language)}</Descriptions.Item>
            <Descriptions.Item label={t('date')}>
              {record?.prescriptionDate || record?.createdAt ? formatDate(record.prescriptionDate || record.createdAt || '', language) : '-'}
            </Descriptions.Item>
          </Descriptions>
          <Table
            size='small'
            pagination={false}
            rowKey={(_, i) => String(i)}
            dataSource={record?.items || []}
            loading={isLoadingSaleGroup}
            columns={[
              {
                title: t('productName'),
                key: 'product',
                render: (_: unknown, row: IPrescriptionItem) => productName(row),
              },
              { title: t('quantity'), dataIndex: 'quantity', key: 'quantity', align: 'center' as const, render: (v: number) => formatNumberByLanguage(v, language) },
              {
                title: t('salePrice'),
                key: 'salePrice',
                align: 'center' as const,
                render: (_: unknown, row: IPrescriptionItem) => salePrice(row) ? formatCurrencyByLanguage(salePrice(row), language) : '-',
              },
              {
                title: t('subtotal'),
                key: 'subtotal',
                align: 'center' as const,
                render: (_: unknown, row: IPrescriptionItem) => formatCurrencyByLanguage(subtotal(row), language),
              },
              {
                title: t('instruction'),
                dataIndex: 'instruction',
                key: 'instruction',
                render: (v: string) => v || '-',
              },
            ]}
          />
        </>
      )}
    </Modal>
  );
};

export default PrescriptionDetailModal;
