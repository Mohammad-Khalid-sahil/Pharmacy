import { Button, Col, Flex, Row } from 'antd';
import { SpinnerIcon } from '@phosphor-icons/react';
import { FieldValues, useForm } from 'react-hook-form';
import CustomInput from '../components/CustomInput';
import CreateSeller from '../components/product/CreateSeller';
import toastMessage from '../lib/toastMessage';
import { useCreateNewProductMutation } from '../redux/features/management/productApi';
import { useGetAllSellerQuery } from '../redux/features/management/sellerApi';
import { ISeller } from '../types/product.types';
import { useLanguage } from '../i18n/LanguageContext';
import { isValidLocalizedInteger, isValidLocalizedNumber, parseLocalizedNumber } from '../utils/numberNormalizer';

const parseNumericValue = parseLocalizedNumber;
const isValidNumber = isValidLocalizedNumber;
const isValidInteger = isValidLocalizedInteger;

const CreateProduct = () => {
  const { t } = useLanguage();
  const [createNewProduct, { isLoading: isCreatingProduct }] = useCreateNewProductMutation();
  const { data: sellers, isLoading: isSellerLoading } = useGetAllSellerQuery(undefined);

  const {
    handleSubmit,
    register,
    formState: { errors },
    reset,
  } = useForm();

  const onSubmit = async (data: FieldValues) => {
    const salePriceValue = parseNumericValue(data.price);
    const purchasePriceValue = isValidNumber(data.purchasePrice)
      ? parseNumericValue(data.purchasePrice)
      : salePriceValue;

    const payload = {
      ...data,
      price: salePriceValue,
      purchasePrice: purchasePriceValue,
      salePrice: salePriceValue,
      stock: parseNumericValue(data.stock),
      minStock: isValidNumber(data.minStock) ? parseNumericValue(data.minStock) : 5,
    };

    try {
      const res = await createNewProduct(payload).unwrap();
      if (res.statusCode === 201) {
        toastMessage({ icon: 'success', text: res.message });
        reset();
      }
    } catch (error: any) {
      toastMessage({ icon: 'error', text: error.data?.message || 'Failed to save medicine' });
    }
  };

  return (
    <div className='products-page'>
      <div className='product-page-header create-medicine-page-header'>
        <div>
          <span>{t('addProduct')}</span>
          <h1>{t('addProduct')}</h1>
          <p>{t('productFormSubtitle')}</p>
        </div>
      </div>
      <Row gutter={[24, 24]} className='product-create-layout'>
        <Col xs={{ span: 24 }} lg={{ span: 14 }}>
          <Flex vertical className='product-form-card'>
            <div className='product-card-title'>
              <h2>{t('medicineName')}</h2>
              <p>{t('productFormSubtitle')}</p>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className='product-form-grid'>
              <CustomInput name='name' errors={errors} label={t('medicineName')} register={register} required />
              <CustomInput
                errors={errors}
                label={t('barcode')}
                name='barcode'
                register={register}
              />
              <CustomInput
                errors={errors}
                label={t('salePrice')}
                type='number'
                name='price'
                register={register}
                required
                validation={{ validate: (value: string) => isValidNumber(value) && parseNumericValue(value) >= 0 }}
              />
              <CustomInput
                errors={errors}
                label={t('purchasePrice')}
                type='number'
                name='purchasePrice'
                register={register}
                required
                validation={{ validate: (value: string) => isValidNumber(value) && parseNumericValue(value) >= 0 }}
              />
              <CustomInput
                errors={errors}
                label={t('stock')}
                type='number'
                name='stock'
                register={register}
                required
                validation={{ validate: (value: string) => isValidInteger(value, 0) }}
              />
              <CustomInput
                errors={errors}
                label={t('minStock')}
                type='number'
                name='minStock'
                register={register}
                validation={{ validate: (value: string) => value === '' || isValidInteger(value) }}
              />
              <CustomInput errors={errors} label={t('expireDate')} type='date' name='expireDate' register={register} />
              <CustomInput errors={errors} label={t('shelfLocation')} name='location' register={register} />

              <Row className='product-form-row'>
                <Col xs={{ span: 24 }} lg={{ span: 6 }}>
                  <label htmlFor='seller' className='label'>
                    {t('sellers')}
                  </label>
                </Col>
                <Col xs={{ span: 24 }} lg={{ span: 18 }}>
                  <select
                    id='seller'
                    disabled={isSellerLoading}
                    {...register('seller', { required: true })}
                    className={`input-field product-select-field ${errors['seller'] ? 'input-field-error' : ''}`}
                  >
                    <option value=''>{t('selectSeller')}*</option>
                    {sellers?.data.map((item: ISeller) => (
                      <option value={item._id} key={item._id}>{item.name}</option>
                    ))}
                  </select>
                </Col>
              </Row>

              <CustomInput label={t('description')} name='description' register={register} />

              <Flex justify='flex-end' className='product-form-actions'>
                <Button
                  htmlType='submit'
                  type='primary'
                  className='btn-role-add'
                  disabled={isCreatingProduct}
                  style={{ textTransform: 'uppercase', fontWeight: 'bold' }}
                >
                  {isCreatingProduct && <SpinnerIcon className='spin' weight='bold' />}
                  {t('addProduct')}
                </Button>
              </Flex>
            </form>
          </Flex>
        </Col>
        <Col xs={{ span: 24 }} lg={{ span: 10 }}>
          <Flex vertical className='product-side-card'>
            <CreateSeller />
          </Flex>
        </Col>
      </Row>
    </div>
  );
};

export default CreateProduct;
