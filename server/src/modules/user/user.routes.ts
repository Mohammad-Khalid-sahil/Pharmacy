import { Router } from 'express';
import userControllers from './user.controllers';
import validateRequest from '../../middlewares/validateRequest';
import userValidator from './user.validator';
import verifyAuth from '../../middlewares/verifyAuth';
import verifyRole from '../../middlewares/verifyRole';
import { UserRole } from '../../constant/userRole';

const userRoutes = Router();

// Public registration disabled to enforce single-admin system
// userRoutes.post('/register', validateRequest(userValidator.registerSchema), userControllers.register);
userRoutes.post('/login', validateRequest(userValidator.loginSchema), userControllers.login);
userRoutes.get('/self', verifyAuth, userControllers.getSelf);
userRoutes.get('/', verifyAuth, verifyRole(UserRole.SUPER_ADMIN), userControllers.getAllUsers);
userRoutes.post('/', verifyAuth, verifyRole(UserRole.SUPER_ADMIN), validateRequest(userValidator.registerSchema), userControllers.createUser);
userRoutes.post(
  '/change-password',
  verifyAuth,
  validateRequest(userValidator.changePasswordSchema),
  userControllers.changePassword
);
userRoutes.patch('/', verifyAuth, userControllers.updateProfile);

export default userRoutes;
