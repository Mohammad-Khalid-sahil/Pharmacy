import { Button, Flex, Modal } from 'antd';
import { ChangeEvent, useEffect, useState } from 'react';
import toastMessage from '../../lib/toastMessage';
import { useUpdateProductMutation } from '../../redux/features/management/productApi';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  getUpdateModal,
  getUpdateModalData,
  toggleUpdateModel,
} from '../../redux/services/modal.Slice';
import { IProduct } from '../../types/product.types';
import ModalInput from './ModalInput';
import { useLanguage } from '../../i18n/LanguageContext';
import { parseLocalizedNumber } from '../../utils/numberNormalizer';

const EditModal = () => {
  const { t } = useLanguage();
  const modalOpen = useAppSelector(getUpdateModal);
  const data = useAppSelector(getUpdateModalData);
  const [updateProduct] = useUpdateProductMutation();
  const dispatch = useAppDispatch();
  const [updateDate, setUpdateDate] = useState<Partial<IProduct>>();

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setUpdateDate((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = async () => {
    const payload = { ...updateDate };
    payload.price = parseLocalizedNumber(updateDate?.price, 0);
    payload.stock = parseLocalizedNumber(updateDate?.stock, 0);

    try {
      const res = await updateProduct({ id: updateDate?._id, payload }).unwrap();

      if (res.statusCode === 200) {
        toastMessage({ icon: 'success', text: res.message });
        dispatch(toggleUpdateModel({ open: false, data: null }));
      }
    } catch (error: any) {
      toastMessage({ icon: 'error', text: error.data.message });
    }
  };

  useEffect(() => {
    setUpdateDate(data!);
  }, [data]);

  return (
    <>
      <Modal
        title={t('update')}
        centered
        open={modalOpen}
        onOk={() => dispatch(toggleUpdateModel({ open: false, data: null }))}
        onCancel={() => dispatch(toggleUpdateModel({ open: false, data: null }))}
        footer={[
          <Button
            key='back'
            onClick={() => dispatch(toggleUpdateModel({ open: false, data: null }))}
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
          <Flex justify='center' style={{ margin: '1rem' }}>
            <Button key='submit' type='primary' onClick={onSubmit}>
              {t('update')}
            </Button>
          </Flex>
        </form>
      </Modal>
    </>
  );
};

export default EditModal;
