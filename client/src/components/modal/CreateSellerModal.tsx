import { Button, Flex, Modal } from 'antd';
import { FieldValues, useForm } from 'react-hook-form';
import CustomInput from '../CustomInput';
import { useCreateSellerMutation } from '../../redux/features/management/sellerApi';
import toastMessage from '../../lib/toastMessage';
import { SpinnerIcon } from '@phosphor-icons/react';
import { useLanguage } from '../../i18n/LanguageContext';

interface CreateSellerModalProps {
  openModal: boolean;
  setOpenModal: React.Dispatch<React.SetStateAction<boolean>>;
}

const CreateSellerModal = ({ openModal, setOpenModal }: CreateSellerModalProps) => {
  const { t } = useLanguage();
  const [createSeller, { isLoading }] = useCreateSellerMutation();
  const {
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data: FieldValues) => {
    try {
      const res = await createSeller(data).unwrap();
      if (res.statusCode === 201) {
        reset();
        toastMessage({ icon: 'success', text: res.message });
        setOpenModal(false);
      }
    } catch (error: any) {
      toastMessage({ icon: 'error', text: error.data.message });
    }
  };

  return (
    <>
      <Modal
        title={t('createSeller')}
        centered
        open={openModal}
        onOk={() => setOpenModal(false)}
        onCancel={() => setOpenModal(false)}
        footer={[
          <Button key='back' className='btn-role-neutral' onClick={() => setOpenModal(false)}>
            {t('cancel')}
          </Button>,
        ]}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <CustomInput
            name='name'
            errors={errors}
            register={register}
            label={t('sellerName')}
            required={true}
          />
          <CustomInput
            name='email'
            errors={errors}
            register={register}
            label={t('email')}
            required={true}
          />
          <CustomInput
            name='contactNo'
            errors={errors}
            register={register}
            label={t('contactNumber')}
            required={true}
          />
          <Flex justify='center' style={{ margin: '1rem' }}>
            <Button key='submit' type='primary' className='btn-role-add' htmlType='submit' disabled={isLoading}>
              {isLoading && <SpinnerIcon className='spin' weight='bold' />}
              {t('createSeller')}
            </Button>
          </Flex>
        </form>
      </Modal>
    </>
  );
};

export default CreateSellerModal;
