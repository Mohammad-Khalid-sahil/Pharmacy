import { Router } from 'express';
import verifyAuth from '../../middlewares/verifyAuth';
import verifyRole from '../../middlewares/verifyRole';
import { UserRole } from '../../constant/userRole';
import activityLogControllers from './activityLog.controllers';

const activityLogRoutes = Router();
activityLogRoutes.use(verifyAuth, verifyRole(UserRole.SUPER_ADMIN));
activityLogRoutes.get('/', activityLogControllers.readAll);

export default activityLogRoutes;
