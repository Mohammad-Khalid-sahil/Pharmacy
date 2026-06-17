import { Button, Flex } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

const NotFound = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleClick = () => {
    navigate(-1);
  };

  return (
    <Flex justify='center' align='center' style={{ height: '100vh' }}>
      <Flex
        vertical
        gap={10}
        align='center'
        style={{ border: `1px solid var(--color-border)`, padding: '3rem', borderRadius: '.8rem' }}
      >
        <h1>{t('notFound')}</h1>
        <h3>{t('pageNotFound')}</h3>
        <Button type='primary' onClick={handleClick}>
          {t('goBack')}
        </Button>
      </Flex>
    </Flex>
  );
};

export default NotFound;
