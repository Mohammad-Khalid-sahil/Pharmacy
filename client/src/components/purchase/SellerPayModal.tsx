import { Descriptions, Form, Input, InputNumber, Modal } from 'antd';
import { useEffect } from 'react';
import {
  useCreateSellerPaymentMutation,
  useGetSellerBalanceQuery,
} from '../../redux/features/management/cashboxApi';
import { useLanguage } from '../../i18n/LanguageContext';
import toastMessage from '../../lib/toastMessage';
import { formatCurrencyByLanguage, getCurrencyAddonByLanguage } from '../../utils/formatters';
import { inputNumberParser, parseLocalizedNumber } from '../../utils/numberNormalizer';

type SellerPayModalProps = {
  open: boolean;
  sellerId: string | null;
  sellerName: string;
  onClose: () => void;
};

const SellerPayModal = ({ open, sellerId, sellerName, onClose }: SellerPayModalProps) => {
  const { t, language } = useLanguage();
  const money = (value: number) => formatCurrencyByLanguage(value, language);
  const [form] = Form.useForm();
  const { data: balanceData, isFetching: loadingBalance, refetch } = useGetSellerBalanceQuery(
    sellerId!,
    { skip: !sellerId || !open }
  );
  const [createSellerPayment, { isLoading }] = useCreateSellerPaymentMutation();

  const balance = balanceData?.data?.balance ?? 0;
  const purchases = balanceData?.data?.purchases ?? 0;
  const payments = balanceData?.data?.payments ?? 0;

  useEffect(() => {
    if (!open) {
      form.resetFields();
    }
  }, [open, form]);

  const onFinish = async (values: { amount: number; paymentDate?: string; note?: string }) => {
    if (!sellerId) return;
    try {
      const res = await createSellerPayment({
        seller: sellerId,
        amount: parseLocalizedNumber(values.amount),
        ...(values.paymentDate ? { paymentDate: values.paymentDate } : {}),
        ...(values.note?.trim() ? { note: values.note.trim() } : {}),
      }).unwrap();
      toastMessage({ icon: 'success', text: res.message || t('sellerPaymentSuccess') });
      form.resetFields();
      refetch();
      onClose();
    } catch (error: any) {
      toastMessage({
        icon: 'error',
        text: error?.data?.message || t('sellerPaymentFailed'),
      });
    }
  };

  return (
    <Modal
      title={t('paySeller')}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={isLoading}
      destroyOnClose
    >
      <Descriptions bordered size='small' column={1} style={{ marginBottom: '1rem' }}>
        <Descriptions.Item label={t('sellerName')}>{sellerName}</Descriptions.Item>
        <Descriptions.Item label={t('remainingPayableBalance')}>
          {loadingBalance ? t('loading') : money(balance)}
        </Descriptions.Item>
        <Descriptions.Item label={t('totalPurchases')}>{loadingBalance ? '-' : money(purchases)}</Descriptions.Item>
        <Descriptions.Item label={t('totalPayments')}>{loadingBalance ? '-' : money(payments)}</Descriptions.Item>
      </Descriptions>

      <Form form={form} layout='vertical' onFinish={onFinish}>
        <Form.Item
          name='amount'
          label={t('amount')}
          rules={[
            { required: true, message: t('amountRequired') },
            {
              validator: (_, value) =>
                parseLocalizedNumber(value) >= 0.01 ? Promise.resolve() : Promise.reject(new Error(t('amountMin'))),
            },
          ]}
        >
          <InputNumber min={0.01} parser={inputNumberParser} style={{ width: '100%' }} addonAfter={getCurrencyAddonByLanguage(language)} />
        </Form.Item>
        <Form.Item name='paymentDate' label={t('paymentDateOptional')}>
          <Input type='date' />
        </Form.Item>
        <Form.Item name='note' label={t('noteOptional')}>
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SellerPayModal;
