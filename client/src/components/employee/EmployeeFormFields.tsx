import { Form, Input, InputNumber, Select } from 'antd';
import { useLanguage } from '../../i18n/LanguageContext';
import { inputNumberParser } from '../../utils/numberNormalizer';

const EmployeeFormFields = () => {
  const { t } = useLanguage();

  return (
    <>
      <Form.Item name='name' label={t('name')} rules={[{ required: true, message: t('nameRequired') }]}>
        <Input />
      </Form.Item>
      <Form.Item name='phone' label={t('phone')}>
        <Input />
      </Form.Item>
      <Form.Item name='position' label={t('position')}>
        <Input />
      </Form.Item>
      <Form.Item name='salary' label={t('salary')}>
        <InputNumber min={0} parser={inputNumberParser} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name='address' label={t('address')}>
        <Input />
      </Form.Item>
      <Form.Item name='note' label={t('note')}>
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item name='status' label={t('status')}>
        <Select
          allowClear
          placeholder={t('statusOptional')}
          options={[
            { value: 'ACTIVE', label: t('statusActive') },
            { value: 'INACTIVE', label: t('statusInactive') },
          ]}
        />
      </Form.Item>
    </>
  );
};

export default EmployeeFormFields;
