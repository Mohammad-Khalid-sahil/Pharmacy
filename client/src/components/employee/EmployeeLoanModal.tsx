import { Button, Descriptions, Form, Input, InputNumber, Modal, Select, Table, Tag } from 'antd';
import { useEffect } from 'react';
import { useCreateEmployeeLoanMutation, useGetEmployeeLoansQuery } from '../../redux/features/management/employeeLoanApi';
import { IEmployee } from '../../types/employee.types';
import { useLanguage } from '../../i18n/LanguageContext';
import toastMessage from '../../lib/toastMessage';
import { formatCurrencyByLanguage } from '../../utils/formatters';
import { inputNumberParser, parseLocalizedNumber } from '../../utils/numberNormalizer';

type EmployeeLoanModalProps = {
  employee: IEmployee | null;
  onClose: () => void;
};

const EmployeeLoanModal = ({ employee, onClose }: EmployeeLoanModalProps) => {
  const { t, language } = useLanguage();
  const [form] = Form.useForm();
  const formatMoney = (value: number | undefined) =>
    value != null ? formatCurrencyByLanguage(value, language) : '-';
  const { data: loansData, refetch } = useGetEmployeeLoansQuery(
    { employee: employee?._id || '', limit: 100 },
    { skip: !employee?._id },
  );
  const [createEmployeeLoan, { isLoading }] = useCreateEmployeeLoanMutation();

  useEffect(() => {
    if (!employee) {
      form.resetFields();
      return;
    }
    form.setFieldsValue({
      transactionType: 'LOAN',
      date: new Date().toISOString().slice(0, 10),
    });
  }, [employee, form]);

  const onFinish = async (values: {
    transactionType: 'LOAN' | 'REPAYMENT';
    amount: number;
    date?: string;
    note?: string;
  }) => {
    if (!employee) return;
    try {
      const res = await createEmployeeLoan({
        employee: employee._id,
        transactionType: values.transactionType,
        amount: parseLocalizedNumber(values.amount),
        ...(values.date ? { date: values.date } : {}),
        ...(values.note?.trim() ? { note: values.note.trim() } : {}),
      }).unwrap();
      toastMessage({ icon: 'success', text: res.message || t('employeeLoanSaved') });
      form.resetFields();
      form.setFieldsValue({ transactionType: 'LOAN', date: new Date().toISOString().slice(0, 10) });
      refetch();
    } catch (error: any) {
      toastMessage({ icon: 'error', text: error?.data?.message || t('employeeLoanFailed') });
    }
  };

  const loanRows = loansData?.data || [];

  return (
    <Modal
      title={t('employeeLoan')}
      open={!!employee}
      onCancel={onClose}
      footer={null}
      width={760}
      destroyOnClose
      className='employee-loan-modal'
    >
      {employee && (
        <>
          <Descriptions bordered size='small' column={2} style={{ marginBottom: '1rem' }}>
            <Descriptions.Item label={t('name')}>{employee.name}</Descriptions.Item>
            <Descriptions.Item label={t('salaryDebt')}>{formatMoney(employee.salaryDebt)}</Descriptions.Item>
            <Descriptions.Item label={t('totalLoans')}>{formatMoney(employee.totalLoans)}</Descriptions.Item>
            <Descriptions.Item label={t('totalRepayments')}>{formatMoney(employee.totalRepayments)}</Descriptions.Item>
            <Descriptions.Item label={t('loanRemainingBalance')}>{formatMoney(employee.loanRemainingBalance)}</Descriptions.Item>
            <Descriptions.Item label={t('remainingBalance')}>{formatMoney(employee.remainingBalance)}</Descriptions.Item>
          </Descriptions>

          <Form form={form} layout='vertical' onFinish={onFinish}>
            <Form.Item name='transactionType' label={t('type')} rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'LOAN', label: t('employeeLoanGive') },
                  { value: 'REPAYMENT', label: t('employeeLoanRepayment') },
                ]}
              />
            </Form.Item>
            <Form.Item name='amount' label={t('amount')} rules={[{ required: true, message: t('amountRequired') }]}>
              <InputNumber min={0.01} parser={inputNumberParser} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name='date' label={t('date')}>
              <Input type='date' />
            </Form.Item>
            <Form.Item name='note' label={t('noteOptional')}>
              <Input.TextArea rows={2} />
            </Form.Item>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={onClose}>{t('close')}</Button>
              <Button type='primary' htmlType='submit' loading={isLoading}>{t('submit')}</Button>
            </div>
          </Form>

          <Table
            style={{ marginTop: '1rem' }}
            size='small'
            dataSource={loanRows}
            rowKey='_id'
            pagination={false}
            columns={[
              { title: t('date'), dataIndex: 'date', key: 'date' },
              {
                title: t('type'),
                dataIndex: 'transactionType',
                key: 'transactionType',
                render: (value: string) => (
                  <Tag color={value === 'LOAN' ? 'orange' : 'green'}>
                    {value === 'LOAN' ? t('employeeLoanGive') : t('employeeLoanRepayment')}
                  </Tag>
                ),
              },
              {
                title: t('amount'),
                dataIndex: 'amount',
                key: 'amount',
                render: (value: number) => formatMoney(value),
              },
              { title: t('note'), dataIndex: 'note', key: 'note', render: (v: string) => v || '-' },
            ]}
          />
        </>
      )}
    </Modal>
  );
};

export default EmployeeLoanModal;
