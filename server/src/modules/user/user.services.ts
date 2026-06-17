import httpStatus from 'http-status';
import CustomError from '../../errors/customError';
import generateToken from '../../utils/generateToken';
import { IUser } from './user.interface';
import User from './user.model';
import verifyPassword from '../../utils/verifyPassword';
import bcrypt from 'bcrypt';
import { UserRole, UserStatus } from '../../constant/userRole';

class UserServices {
  private model = User;

  // get profile
  async getSelf(userId: string) {
    return this.model.findById(userId);
  }
  // register new user
  async register(payload: any) {
    if (payload.password !== payload.confirmPassword) {
      throw new CustomError(httpStatus.BAD_REQUEST, 'Passwords do not match');
    }

    const userCount = await this.model.countDocuments();
    if (userCount > 0 && payload.role === UserRole.SUPER_ADMIN) {
      throw new CustomError(httpStatus.FORBIDDEN, 'Super admin already exists');
    }

    const user = await this.model.create({
      ...payload,
      role: userCount === 0 ? UserRole.SUPER_ADMIN : UserRole.USER,
      status: UserStatus.ACTIVE
    });

    const token = generateToken({ _id: user._id, email: user.email, role: user.role, name: user.name, status: user.status });
    return { token, user };
  }

  async createUserByAdmin(payload: any, adminId: string) {
    if (payload.password !== payload.confirmPassword) {
      throw new CustomError(httpStatus.BAD_REQUEST, 'Passwords do not match');
    }

    const admin = await this.model.findById(adminId);
    if (!admin || admin.role !== UserRole.SUPER_ADMIN) {
      throw new CustomError(httpStatus.FORBIDDEN, 'Only super admin can create users');
    }

    const user = await this.model.create({
      ...payload,
      role: payload.role || UserRole.USER,
      status: payload.status || UserStatus.ACTIVE
    });

    return user;
  }

  async getAllUsers() {
    return this.model.find().select('-password').sort({ createdAt: -1 });
  }

  // login existing user
  async login(payload: { email: string; password: string }) {
    const user = await this.model.findOne({ email: payload.email }).select('+password');

    if (user) {
      await verifyPassword(payload.password, user.password);

      if (user.status !== UserStatus.ACTIVE) {
        throw new CustomError(httpStatus.FORBIDDEN, 'Your account is not active');
      }

      const token = generateToken({ _id: user._id, email: user.email, role: user.role, name: user.name, status: user.status });
      return { token, user };
    } else {
      throw new CustomError(httpStatus.BAD_REQUEST, 'WrongCredentials');
    }
  }

  // update user profile
  async updateProfile(id: string, payload: Partial<IUser>) {
    return this.model.findByIdAndUpdate(id, payload);
  }

  // change Password
  async changePassword(userId: string, payload: { oldPassword: string; newPassword: string }) {
    const user = await this.model.findById(userId).select('+password');
    if (!user) throw new CustomError(httpStatus.NOT_FOUND, 'User not found');

    const matchedPassword = await bcrypt.compare(payload.oldPassword, user.password);

    if (!matchedPassword) {
      throw new CustomError(400, 'Old Password does not matched!');
    }

    const hashedPassword = await bcrypt.hash(payload.newPassword, 10);
    const updatedUser = await this.model.findByIdAndUpdate(userId, { password: hashedPassword });

    return updatedUser;
  }
}

const userServices = new UserServices();
export default userServices;
