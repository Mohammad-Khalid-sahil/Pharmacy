import { DollarOutlined } from '@ant-design/icons';
import { Descriptions, Form, Input, InputNumber, Modal, Select } from 'antd';
import { useEffect } from 'react';
import { useCreateSalaryPaymentMutation } from '../../redux/features/management/salaryPaymentApi';
import { useGetEmployeesQuery } from '../../redux/features/management/employeeApi';
import { useLanguage } from '../../i18n/LanguageContext';
import toastMessage from '../../lib/toastMessage';
import { formatCurrencyByLanguage, getCurrencyAddonByLanguage } from '../../utils/formatters';
import { inputNumberParser, parseLocalizedNumber } from '../../utils/numberNormalizer';

type SalaryPayModalProps = {
  open: boolean;
  presetEmployee?: { id: string; name: string; salary?: number } | null;
  onClose: () => void;
};

const SalaryPayModal = ({ open, presetEmployee, onClose }: SalaryPayModalProps) => {
  const { t, language } = useLanguage();
  const formatMoney = (value: number | undefined) =>
    value != null ? formatCurrencyByLanguage(value, language) : '-';
  const [form] = Form.useForm();
  const { data: employeesData } = useGetEmployeesQuery({ limit: 200 }, { skip: !open });
  const [createSalaryPayment, { isLoading }] = useCreateSalaryPaymentMutation();

  const employees = employeesData?.data || [];
  const employeeOptions = employees.map((e: { _id: string; name: string }) => ({
    value: e._id,
    label: `${e.name}${typeof (e as any).salary === 'number' ? ` - ${formatMoney((e as any).salary)}` : ''}`,
  }));

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }
    if (presetEmployee) {
      form.setFieldsValue({
        employee: presetEmployee.id,
        amount: presetEmployee.salary,
        paymentDate: new Date().toISOString().slice(0, 10),
      });
    }
  }, [open, presetEmployee, form]);

  const onFinish = async (values: {
    employee: string;
    amount: number;
    paymentDate?: string;
    note?: string;
  }) => {
    try {
      const res = await createSalaryPayment({
        employee: values.employee,
        amount: parseLocalizedNumber(values.amount),
        ...(values.paymentDate ? { paymentDate: values.paymentDate } : {}),
        ...(values.note?.trim() ? { note: values.note.trim() } : {}),
      }).unwrap();
      toastMessage({ icon: 'success', text: res.message || t('salaryPaymentSuccess') });
      form.resetFields();
      onClose();
    } catch (error: any) {
      toastMessage({
        icon: 'error',
        text: error?.data?.message || t('salaryPaymentFailed'),
      });
    }
  };

  return (
    <Modal
      title={t('paySalary')}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText={t('paySalary')}
      cancelText={t('cancel')}
      confirmLoading={isLoading}
      destroyOnClose
      className='salary-pay-modal'
    >
      <div className='salary-pay-header'>
        <DollarOutlined />
        <div>
          <h3>{t('paySalary')}</h3>
          <p>{t('salaryPaymentSubtitle')}</p>
        </div>
      </div>

      {presetEmployee && (
        <Descriptions bordered size='small' column={1} className='salary-pay-employee'>
          <Descriptions.Item label={t('name')}>{presetEmployee.name}</Descriptions.Item>
          {presetEmployee.salary != null && (
            <Descriptions.Item label={t('salary')}>
              {formatMoney(presetEmployee.salary)}
            </Descriptions.Item>
          )}
        </Descriptions>
      )}

      <Form
        form={form}
        layout='vertical'
        onFinish={onFinish}
        className='salary-pay-form'
        onValuesChange={(changed) => {
          if (!changed.employee || presetEmployee) return;
          const employee = employees.find((item: { _id: string }) => item._id === changed.employee);
          if (employee && typeof employee.salary === 'number') {
            form.setFieldValue('amount', employee.salary);
          }
        }}
      >
        {!presetEmployee && (
          <Form.Item
            name='employee'
            label={t('employee')}
            rules={[{ required: true, message: t('employeeRequired') }]}
          >
            <Select showSearch optionFilterProp='label' options={employeeOptions} />
          </Form.Item>
        )}
        {presetEmployee && (
          <Form.Item name='employee' hidden rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        )}

        <Form.Item
          name='amount'
          label={t('amount')}
          rules={[
            { required: true, message: t('amountRequired') },
            {
              validator: (_: any, value: any) => {
                const amount = parseLocalizedNumber(value);
                return value !== undefined && value !== null && value !== '' && !Number.isNaN(amount) && amount >= 0.01
                  ? Promise.resolve()
                  : Promise.reject(new Error(t('amountMin')));
              },
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

export default SalaryPayModal;
