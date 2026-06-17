import { EditFilled, EditOutlined, IdcardOutlined, LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Col, Flex, Row, Tag } from 'antd';
import { Link } from 'react-router-dom';
import userProPic from '../assets/User.png';
import Loader from '../components/Loader';
import { profileKeys } from '../constant/profile';
import { useLanguage } from '../i18n/LanguageContext';
import { useGetSelfProfileQuery } from '../redux/features/authApi';
import { DEFAULT_LOCAL_USER, TUser } from '../redux/services/authSlice';

const ProfilePage = () => {
  const { t } = useLanguage();
  const { data, isLoading } = useGetSelfProfileQuery(undefined);
  const profile = (data?.data || DEFAULT_LOCAL_USER) as TUser;

  if (isLoading) return <Loader />;

  const labelMap: Record<string, string> = {
    name: t('name'),
    email: t('email'),
    position: t('position'),
    role: t('role'),
    status: t('status'),
    address: t('address'),
    phone: t('phone'),
    city: t('city'),
  };

  return (
    <div className='profile-page page-fade-in'>
      <div className='profile-page-header'>
        <div>
          <span>{t('profilePageSubtitle')}</span>
          <h1>{t('profile')}</h1>
          <p>{t('profilePageDescription')}</p>
        </div>
        <IdcardOutlined />
      </div>

      <Row gutter={[18, 18]}>
        <Col xs={24} lg={8}>
          <div className='profile-identity-card'>
            <div className='profile-avatar-ring'>
              <img src={profile.avatar || userProPic} alt={profile.name || 'user'} />
            </div>
            <h2>{profile.name || '-'}</h2>
            <p>{profile.position || profile.role || '-'}</p>
            <Tag color={profile.status === 'ACTIVE' ? 'success' : 'warning'} className='profile-status-tag'>
              {profile.status || '-'}
            </Tag>
            <Flex gap={8} wrap='wrap' justify='center' className='profile-actions'>
              <Link to='/edit-profile'>
                <Button type='primary' className='btn-role-edit' icon={<EditOutlined />}>
                  {t('updateProfile')}
                </Button>
              </Link>
              <Link to='/change-password'>
                <Button type='primary' className='btn-role-primary' icon={<LockOutlined />}>
                  {t('changePassword')}
                </Button>
              </Link>
            </Flex>
          </div>
        </Col>

        <Col xs={24} lg={16}>
          <div className='profile-info-card'>
            <div className='profile-card-title'>
              <UserOutlined />
              <h2>{t('profileInformation')}</h2>
            </div>
            <div className='profile-info-grid'>
              {profileKeys.map((key) => (
                <ProfileInfoItem
                  key={key.keyName}
                  label={labelMap[key.keyName] || key.keyName}
                  value={profile[key.keyName] ? String(profile[key.keyName]) : undefined}
                  highlight={key.keyName === 'email'}
                />
              ))}
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

const ProfileInfoItem = ({
  label,
  value,
  highlight,
}: {
  label: string;
  value?: string;
  highlight?: boolean;
}) => (
  <div className='profile-info-item'>
    <span>{highlight ? <MailOutlined /> : <EditFilled />}</span>
    <div>
      <p>{label}</p>
      <strong>{value || '-'}</strong>
    </div>
  </div>
);

export default ProfilePage;
