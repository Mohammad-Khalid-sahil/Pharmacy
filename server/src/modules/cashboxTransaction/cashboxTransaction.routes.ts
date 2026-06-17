import { Router } from 'express';
import verifyAuth from '../../middlewares/verifyAuth';
import validateRequest from '../../middlewares/validateRequest';
import cashboxTransactionValidator from './cashboxTransaction.validator';
import cashboxTransactionControllers from './cashboxTransaction.controllers';

const cashboxTransactionRoutes = Router();
cashboxTransactionRoutes.use(verifyAuth);
cashboxTransactionRoutes.get('/summary', cashboxTransactionControllers.getSummary);
cashboxTransactionRoutes.post('/', validateRequest(cashboxTransactionValidator.createSchema), cashboxTransactionControllers.create);
cashboxTransactionRoutes.get('/', cashboxTransactionControllers.readAll);

export default cashboxTransactionRoutes;
