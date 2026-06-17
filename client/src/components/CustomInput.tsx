import { Col, Row } from 'antd';

interface Props {
  name: string;
  errors?: any;
  label: string;
  type?: string;
  register: any;
  required?: boolean;
  validation?: any;
  defaultValue?: any;
}

const CustomInput = ({
  name,
  errors = {},
  required = false,
  label,
  register,
  type = 'text',
  validation = {},
}: Props) => {
  const isNumeric = type === 'number';
  const inputType = isNumeric ? 'text' : type;
  const inputMode = isNumeric
    ? ['price', 'purchase', 'sale', 'discount'].some((field) => name.toLowerCase().includes(field))
      ? 'decimal'
      : 'numeric'
    : undefined;

  return (
    <Row className='form-field-row'>
      <Col xs={{ span: 23 }} lg={{ span: 6 }}>
        <label htmlFor={name} className='label'>
          {label}
        </label>
      </Col>
      <Col xs={{ span: 23 }} lg={{ span: 18 }}>
        <input
          id={name}
          type={inputType}
          inputMode={inputMode}
          placeholder={label}
          {...register(name, { required: required, ...validation })}
          className={`input-field ${errors[name] ? 'input-field-error' : ''}`}
        />
      </Col>
    </Row>
  );
};

export default CustomInput;
