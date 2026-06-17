import { Button, Descriptions, Flex, Form, Input, InputNumber, Modal, Table } from 'antd';
import { useEffect, useMemo } from 'react';
import {
  useCreateSaleReturnMutation,
  useGetSaleReturnsQuery,
} from '../../redux/features/management/saleReturnApi';
import { useGetSingleSaleQuery } from '../../redux/features/management/saleApi';
import { ISaleReturn } from '../../types/saleReturn.types';
import formatDate from '../../utils/formatDate';
import toastMessage from '../../lib/toastMessage';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatCurrencyByLanguage, formatNumberByLanguage, getCurrencyAddonByLanguage } from '../../utils/formatters';

export type SaleRowForReturn = {
  key: string;
  productName: string;
  productId: string;
  quantity: number;
  productPrice: number;
  totalPrice: number;
  buyerName: string;
  date: string;
  rawDate?: string;
  customer?: string;
};

const sumReturnedQty = (returns: ISaleReturn[] | undefined, productId: string) => {
  if (!returns?.length) return 0;
  return returns.reduce((acc, row) => {
    const items = row.items || [];
    return (
      acc +
      items.reduce((itemAcc, item) => {
        const pid = typeof item.product === 'string' ? item.product : (item.product as { _id?: string })?._id;
        return pid === productId ? itemAcc + item.quantity : itemAcc;
      }, 0)
    );
  }, 0);
};

const SaleReturnModal = ({
  sale,
  open,
  onClose,
  onReturned,
}: {
  sale: SaleRowForReturn | null;
  open: boolean;
  onClose: () => void;
  onReturned?: () => void;
}) => {
  const { t, language } = useLanguage();
  const money = (value: number | undefined) => formatCurrencyByLanguage(value, language);
  const [form] = Form.useForm();
  const returnQty = Form.useWatch('returnQuantity', form) ?? 0;

  const { data: saleDetail, refetch: refetchSale } = useGetSingleSaleQuery(sale?.key || '', {
    skip: !sale?.key || !open,
  });
  const {
    data: returnsData,
    isFetching: loadingReturns,
    refetch: refetchReturns,
  } = useGetSaleReturnsQuery({ sale: sale?.key, limit: 50 }, { skip: !sale?.key || !open });

  const [createReturn, { isLoading }] = useCreateSaleReturnMutation();

  const productId = sale?.productId || saleDetail?.data?.product?._id || '';
  const soldQty = sale?.quantity ?? saleDetail?.data?.quantity ?? 0;
  const totalPrice = sale?.totalPrice ?? saleDetail?.data?.totalPrice ?? 0;
  const customerId =
    sale?.customer ||
    (typeof saleDetail?.data?.customer === 'string'
      ? saleDetail.data.customer
      : saleDetail?.data?.customer?._id);
  const unitRefund = soldQty > 0 ? totalPrice / soldQty : 0;

  const returnedQty = useMemo(
    () => sumReturnedQty(returnsData?.data, productId),
    [returnsData?.data, productId]
  );
  const returnableQty = Math.max(soldQty - returnedQty, 0);

  const refundAmount = useMemo(() => Number((returnQty * unitRefund).toFixed(2)), [returnQty, unitRefund]);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }
    form.setFieldsValue({ returnQuantity: returnableQty > 0 ? 1 : 0 });
  }, [open, sale?.key, returnableQty, form]);

  useEffect(() => {
    form.setFieldsValue({ refundAmount });
  }, [refundAmount, form]);

  const onSubmit = async (values: { returnQuantity: number; reason?: string; note?: string }) => {
    if (!sale || !productId) return;

    const qty = Number(values.returnQuantity);
    if (qty < 1 || qty > returnableQty) {
      toastMessage({ icon: 'error', text: t('returnQtyInvalid') });
      return;
    }

    const payload = {
      sale: sale.key,
      ...(customerId ? { customer: customerId } : {}),
      items: [
        {
          product: productId,
          quantity: qty,
          refundAmount: Number((qty * unitRefund).toFixed(2)),
        },
      ],
      totalRefund: Number((qty * unitRefund).toFixed(2)),
      ...(values.reason ? { reason: values.reason } : {}),
      ...(values.note ? { note: values.note } : {}),
    };

    try {
      const res = await createReturn(payload).unwrap();
      if (res.statusCode === 201) {
        toastMessage({ icon: 'success', text: res.message });
        await refetchReturns();
        await refetchSale();
        onReturned?.();
        const nextReturnable = returnableQty - qty;
        form.setFieldsValue({
          returnQuantity: nextReturnable > 0 ? Math.min(1, nextReturnable) : 0,
          reason: undefined,
          note: undefined,
        });
      }
    } catch (error: any) {
      toastMessage({ icon: 'error', text: error?.data?.message || t('returnFailed') });
    }
  };

  const historyColumns = [
    { title: t('date'), key: 'date', render: (_: unknown, row: ISaleReturn) => formatDate(row.createdAt || '', language) },
    {
      title: t('quantity'),
      key: 'qty',
      render: (_: unknown, row: ISaleReturn) => row.items?.reduce((a, i) => a + i.quantity, 0),
    },
    { title: t('totalRefund'), dataIndex: 'totalRefund', key: 'totalRefund', render: (v: number) => money(v) },
    { title: t('reason'), dataIndex: 'reason', key: 'reason', render: (v: string) => v || '-' },
  ];

  return (
    <Modal
      title={t('returnSale')}
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnClose
    >
      {sale && (
        <>
          <Descriptions bordered size='small' column={2} style={{ marginBottom: '1rem' }}>
            <Descriptions.Item label={t('productName')}>{sale.productName}</Descriptions.Item>
            <Descriptions.Item label={t('buyerName')}>{sale.buyerName}</Descriptions.Item>
            <Descriptions.Item label={t('soldQuantity')}>{formatNumberByLanguage(soldQty, language)}</Descriptions.Item>
            <Descriptions.Item label={t('alreadyReturned')}>{formatNumberByLanguage(returnedQty, language)}</Descriptions.Item>
            <Descriptions.Item label={t('returnableQuantity')}>{formatNumberByLanguage(returnableQty, language)}</Descriptions.Item>
            <Descriptions.Item label={t('unitRefund')}>{formatCurrencyByLanguage(unitRefund, language)}</Descriptions.Item>
          </Descriptions>

          {returnableQty > 0 ? (
            <Form form={form} layout='vertical' onFinish={onSubmit}>
              <Form.Item
                name='returnQuantity'
                label={t('returnQuantity')}
                rules={[
                  { required: true, message: t('returnQtyRequired') },
                  {
                    validator: async (_, value) => {
                      const qty = Number(value);
                      if (qty < 1) throw new Error(t('returnQtyMin'));
                      if (qty > returnableQty) throw new Error(t('returnQtyMax'));
                    },
                  },
                ]}
              >
                <InputNumber min={1} max={returnableQty} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label={t('refundAmount')}>
                <InputNumber value={refundAmount} disabled style={{ width: '100%' }} addonAfter={getCurrencyAddonByLanguage(language)} />
              </Form.Item>
              <Form.Item name='reason' label={t('reason')}>
                <Input placeholder={t('reasonOptional')} />
              </Form.Item>
              <Form.Item name='note' label={t('note')}>
                <Input.TextArea rows={2} placeholder={t('noteOptional')} />
              </Form.Item>
              <Flex justify='end' gap={8}>
                <Button className='btn-role-neutral' onClick={onClose}>{t('cancel')}</Button>
                <Button type='primary' className='btn-role-return' htmlType='submit' loading={isLoading}>
                  {t('submitReturn')}
                </Button>
              </Flex>
            </Form>
          ) : (
            <p style={{ color: 'crimson', marginBottom: '1rem' }}>{t('noReturnableQty')}</p>
          )}

          <h3 style={{ marginTop: '1.5rem' }}>{t('returnHistoryForSale')}</h3>
          <Table
            size='small'
            loading={loadingReturns}
            columns={historyColumns}
            dataSource={returnsData?.data || []}
            rowKey='_id'
            pagination={false}
          />
        </>
      )}
    </Modal>
  );
};

export default SaleReturnModal;
