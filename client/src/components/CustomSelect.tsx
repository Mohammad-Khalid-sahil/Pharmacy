import { Col, Row } from 'antd';

interface Option {
  value: string;
  label: string;
}

interface Props {
  name: string;
  errors?: Record<string, unknown>;
  label: string;
  register: any;
  required?: boolean;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  defaultValue?: string;
}

const CustomSelect = ({
  name,
  errors = {},
  required = false,
  label,
  register,
  options,
  placeholder,
  disabled = false,
  defaultValue,
}: Props) => (
  <Row className='form-field-row'>
    <Col xs={{ span: 23 }} lg={{ span: 6 }}>
      <label htmlFor={name} className='label'>
        {label}
      </label>
    </Col>
    <Col xs={{ span: 23 }} lg={{ span: 18 }}>
      <select
        id={name}
        disabled={disabled}
        defaultValue={defaultValue}
        {...register(name, { required })}
        className={`input-field product-select-field ${errors[name] ? 'input-field-error' : ''}`}
      >
        <option value=''>{placeholder || label}{required ? '*' : ''}</option>
        {options.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Col>
  </Row>
);

export default CustomSelect;
