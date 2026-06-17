import User from '../modules/user/user.model';
import { UserRole, UserStatus } from '../constant/userRole';

const seedSuperAdmin = async () => {
  const exists = await User.findOne({ role: UserRole.SUPER_ADMIN });
  if (exists) return;

  await User.create({
    name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
    email: process.env.SUPER_ADMIN_EMAIL || 'admin@pharmacy.local',
    password: process.env.SUPER_ADMIN_PASSWORD || 'Admin12345',
    role: UserRole.SUPER_ADMIN,
    status: UserStatus.ACTIVE
  });

  console.log('Super admin created: admin@pharmacy.local / Admin12345');
};

export default seedSuperAdmin;
