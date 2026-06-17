import { Button, Flex } from 'antd';
import CreateSellerModal from '../modal/CreateSellerModal';
import { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

const CreateSeller = () => {
  const { t } = useLanguage();
  const [createSellerModalOpen, setCreateSellerModalOpen] = useState(false);

  return (
    <>
      <Flex
        vertical
        className='product-side-action'
      >
        <h3
        >
          {t('createSeller')}
        </h3>

        <Button
          htmlType='submit'
          type='primary'
          className='btn-role-add'
          onClick={() => setCreateSellerModalOpen(true)}
        >
          {t('createSeller')}
        </Button>
      </Flex>

      <CreateSellerModal
        openModal={createSellerModalOpen}
        setOpenModal={setCreateSellerModalOpen}
      />
    </>
  );
};

export default CreateSeller;
