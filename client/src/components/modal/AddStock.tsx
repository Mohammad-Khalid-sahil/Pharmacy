import { Button, Flex, Modal } from 'antd';
import { ChangeEvent, useEffect, useState } from 'react';
import toastMessage from '../../lib/toastMessage';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  getCreateVariantModel,
  getCreateVariantModelData,
  toggleCreateVariantModel,
} from '../../redux/services/modal.Slice';
import { IProduct } from '../../types/product.types';
import ModalInput from './ModalInput';
import { useCreateNewProductMutation } from '../../redux/features/management/productApi';
import { useLanguage } from '../../i18n/LanguageContext';
import { parseLocalizedNumber } from '../../utils/numberNormalizer';

const AddStockModal = () => {
  const { t } = useLanguage();
  const modalOpen = useAppSelector(getCreateVariantModel);
  const data = useAppSelector(getCreateVariantModelData);
  const [createVariant] = useCreateNewProductMutation();
  const dispatch = useAppDispatch();
  const [updateDate, setUpdateDate] = useState<Partial<IProduct>>();

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setUpdateDate((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = async () => {
    const payload: any = { ...updateDate };
    payload.price = parseLocalizedNumber(updateDate?.price, 0);
    payload.stock = parseLocalizedNumber((updateDate as any)?.quantity ?? updateDate?.stock, 0);
    delete payload?._id;
    delete payload.createdAt;
    delete payload?.updatedAt;
    delete payload?.__v;
    delete payload?.user;

    try {
      const res = await createVariant(payload).unwrap();
      console.log(res);

      if (res.statusCode === 201) {
        toastMessage({ icon: 'success', text: res.message });
        dispatch(toggleCreateVariantModel({ open: false, data: null }));
      }
    } catch (error: any) {
      toastMessage({ icon: 'error', title: error.data.message, text: error.data.errors[0] });
    }
  };

  useEffect(() => {
    setUpdateDate(data!);
  }, [data]);

  return (
    <>
      <Modal
        title={t('addStock')}
        centered
        open={modalOpen}
        onOk={() => dispatch(toggleCreateVariantModel({ open: false, data: null }))}
        onCancel={() => dispatch(toggleCreateVariantModel({ open: false, data: null }))}
        footer={[
          <Button
            key='back'
            onClick={() => dispatch(toggleCreateVariantModel({ open: false, data: null }))}
          >
            {t('close')}
          </Button>,
        ]}
      >
        <form>
          <ModalInput
            handleChange={handleChange}
            name='name'
            defaultValue={updateDate?.name}
            label={t('medicineName')}
          />
          <ModalInput
            handleChange={handleChange}
            label={t('salePrice')}
            type='number'
            defaultValue={updateDate?.price}
            name='price'
          />
          <ModalInput
            handleChange={handleChange}
            label={t('quantity')}
            type='number'
            name='quantity'
            defaultValue={updateDate?.stock}
          />
          <Flex justify='center' style={{ margin: '1rem' }}>
            <Button key='submit' type='primary' onClick={onSubmit}>
              {t('createNewVariant')}
            </Button>
          </Flex>
        </form>
      </Modal>
    </>
  );
};

export default AddStockModal;
