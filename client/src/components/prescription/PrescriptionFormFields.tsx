import { Form, Input } from 'antd';
import { useLanguage } from '../../i18n/LanguageContext';

const PrescriptionFormFields = () => {
  const { t } = useLanguage();

  return (
    <>
      <Form.Item name='patientName' label={t('patientNameOptional')}>
        <Input />
      </Form.Item>
      <Form.Item name='doctorName' label={t('doctorNameOptional')}>
        <Input />
      </Form.Item>
      <Form.Item name='note' label={t('noteOptional')}>
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item name='dosage' label={t('dosageOptional')}>
        <Input />
      </Form.Item>
      <Form.Item name='instruction' label={t('instructionOptional')}>
        <Input />
      </Form.Item>
    </>
  );
};

export default PrescriptionFormFields;
