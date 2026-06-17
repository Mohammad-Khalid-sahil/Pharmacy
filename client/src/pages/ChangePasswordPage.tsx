import { ArrowLeftOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Button, Flex, Input } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useLanguage } from '../i18n/LanguageContext';
import { useChangePasswordMutation } from '../redux/features/authApi';

const ChangePasswordPage = () => {
  const { t } = useLanguage();
  const [changePassword] = useChangePasswordMutation();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error(t('allFieldsRequired'));
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t('passwordMinLength'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('passwordMismatch'));
      return;
    }

    const payload = {
      oldPassword,
      newPassword,
      confirmPassword,
    };

    try {
      const toastId = toast.loading(t('changingPassword'));
      const res = await changePassword(payload).unwrap();

      if (res.success) {
        toast.success(t('passwordChangeSuccess'), { id: toastId });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        navigate('/profile');
      }
    } catch (error: any) {
      toast.error(error.data.message, { id: error.data.statusCode });
    }
  };

  return (
    <div className='password-page page-fade-in'>
      <div className='password-card'>
        <div className='password-card-header'>
          <SafetyCertificateOutlined />
          <div>
            <span>{t('profile')}</span>
            <h1>{t('changePassword')}</h1>
            <p>{t('changePasswordDescription')}</p>
          </div>
        </div>

        <Flex vertical gap={12} className='password-form'>
          <label>{t('oldPassword')}</label>
          <Input.Password
            size='large'
            prefix={<LockOutlined />}
            placeholder={t('oldPassword')}
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
          <label>{t('newPassword')}</label>
          <Input.Password
            size='large'
            prefix={<LockOutlined />}
            placeholder={t('newPassword')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <label>{t('confirmPassword')}</label>
          <Input.Password
            size='large'
            prefix={<LockOutlined />}
            placeholder={t('confirmPassword')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Button type='primary' className='btn-role-edit' onClick={handleSubmit}>
            {t('changePassword')}
          </Button>
          <Button type='default' className='btn-role-neutral' onClick={() => navigate('/profile')}>
            <ArrowLeftOutlined /> {t('goBack')}
          </Button>
        </Flex>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
