import { Router } from 'express';
import verifyAuth from '../../middlewares/verifyAuth';
import validateRequest from '../../middlewares/validateRequest';
import customerPaymentValidator from './customerPayment.validator';
import customerPaymentControllers from './customerPayment.controllers';

const customerPaymentRoutes = Router();
customerPaymentRoutes.use(verifyAuth);
customerPaymentRoutes.post('/', validateRequest(customerPaymentValidator.createSchema), customerPaymentControllers.create);
customerPaymentRoutes.get('/', customerPaymentControllers.readAll);

export default customerPaymentRoutes;
