import { ArrowLeftOutlined, IdcardOutlined, SaveOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Col, Flex, Row } from 'antd';
import { ChangeEvent, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import userProPic from '../assets/User.png';
import CustomInput from '../components/CustomInput';
import Loader from '../components/Loader';
import { profileInputFields } from '../constant/profile';
import { useLanguage } from '../i18n/LanguageContext';
import { useGetSelfProfileQuery, useUpdateProfileMutation } from '../redux/features/authApi';

const EditProfilePage = () => {
  const { t } = useLanguage();
  const { data, isLoading } = useGetSelfProfileQuery(undefined);
  const navigate = useNavigate();

  if (isLoading) return <Loader />;

  return (
    <div className='profile-page page-fade-in'>
      <div className='profile-page-header'>
        <div>
          <span>{t('editProfile')}</span>
          <h1>{t('updateProfile')}</h1>
          <p>{t('editProfileDescription')}</p>
        </div>
        <IdcardOutlined />
      </div>

      <Row gutter={[18, 18]}>
        <Col xs={24} lg={8}>
          <div className='profile-identity-card'>
            <div className='profile-avatar-ring'>
              <img src={data?.data?.avatar || userProPic} alt={data?.data?.name || 'user'} />
            </div>
            <h2>{data?.data?.name || '-'}</h2>
            <p>{data?.data?.position || data?.data?.role || '-'}</p>
            <Button type='default' className='btn-role-neutral' onClick={() => navigate('/profile')}>
              <ArrowLeftOutlined /> {t('goBack')}
            </Button>
          </div>
        </Col>
        <Col xs={24} lg={16}>
          <div className='profile-form-card'>
            <div className='profile-card-title'>
              <UserOutlined />
              <h2>{t('profileInformation')}</h2>
            </div>
            <EditProfileForm data={data?.data} />
          </div>
        </Col>
      </Row>
    </div>
  );
};

const EditProfileForm = ({ data }: { data: any }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [updateProfile] = useUpdateProfileMutation();
  const [avatarPreview, setAvatarPreview] = useState<string>(data?.avatar || '');
  const [avatarError, setAvatarError] = useState('');
  const [isAvatarReading, setIsAvatarReading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: data });

  const onImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setAvatarError('');
    setIsAvatarReading(false);
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowedTypes.includes(file.type) || !allowedExtensions.includes(extension)) {
      setAvatarPreview(data?.avatar || '');
      setAvatarError('Invalid image file. Please select JPG, JPEG, PNG, or WEBP.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    setIsAvatarReading(true);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarPreview(reader.result);
      } else {
        setAvatarPreview(data?.avatar || '');
        setAvatarError('Unable to read the selected image.');
      }
      setIsAvatarReading(false);
    };
    reader.onerror = () => {
      setAvatarPreview(data?.avatar || '');
      setAvatarError('Unable to read the selected image.');
      setIsAvatarReading(false);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (formData: any) => {
    if (avatarError || isAvatarReading) {
      toast.error(avatarError || 'Please wait until the selected image is ready.');
      return;
    }

    const payload = { ...formData };
    delete payload._id;
    delete payload.createdAt;
    delete payload.updatedAt;
    delete payload.__v;
    delete payload.role;
    delete payload.status;
    delete payload.password;

    if (avatarPreview) {
      payload.avatar = avatarPreview;
    }

    for (const key in payload) {
      if (payload[key] === '' || payload[key] === undefined || payload[key] === null) {
        delete payload[key];
      }
    }

    const toastId = toast.loading(t('updatingProfile'));
    try {
      const res = await updateProfile(payload).unwrap();

      if (res.success) {
        toast.success(t('profileUpdateSuccess'), { id: toastId });
        navigate('/profile');
      }
    } catch {
      toast.error(t('profileUpdateFailed'), { id: toastId });
    }
  };

  const profileLabels: Record<string, string> = {
    name: t('name'),
    email: t('email'),
    position: t('position'),
    address: t('address'),
    phone: t('phone'),
    city: t('city'),
  };

  return (
    <form className='profile-edit-form' onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>{t('changeProfilePicture')}</label>
        <Flex align='center' gap={14} wrap='wrap'>
          <div className='profile-avatar-ring' style={{ width: 88, height: 88, margin: 0 }}>
            <img src={avatarPreview || userProPic} alt={data?.name || 'user'} />
          </div>
          <div>
            <input type='file' accept='.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp' onChange={onImageChange} />
            {avatarError && <p style={{ color: 'var(--color-danger)', fontWeight: 800, marginTop: 8 }}>{avatarError}</p>}
          </div>
        </Flex>
      </div>
      {profileInputFields.map((input) => (
        <CustomInput
          key={input.id}
          name={input.name}
          errors={errors}
          label={profileLabels[input.name] || input.label}
          register={register}
          required={input.name === 'name' || input.name === 'email'}
        />
      ))}

      <Flex justify='flex-end' className='profile-form-actions'>
        <Button htmlType='submit' type='primary' className='btn-role-edit' icon={<SaveOutlined />} disabled={isAvatarReading}>
          {t('updateProfile')}
        </Button>
      </Flex>
    </form>
  );
};

export default EditProfilePage;
