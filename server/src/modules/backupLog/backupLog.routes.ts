import { Router } from 'express';
import verifyAuth from '../../middlewares/verifyAuth';
import verifyRole from '../../middlewares/verifyRole';
import { UserRole } from '../../constant/userRole';
import backupLogControllers from './backupLog.controllers';

const backupLogRoutes = Router();
backupLogRoutes.use(verifyAuth, verifyRole(UserRole.SUPER_ADMIN));
backupLogRoutes.post('/', backupLogControllers.create);
backupLogRoutes.get('/', backupLogControllers.readAll);
backupLogRoutes.get('/:id/download', backupLogControllers.download);
backupLogRoutes.post('/:id/restore', backupLogControllers.restore);
backupLogRoutes.delete('/:id', backupLogControllers.delete);

export default backupLogRoutes;
