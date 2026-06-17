import { Router } from 'express';
import verifyAuth from '../../middlewares/verifyAuth';
import validateRequest from '../../middlewares/validateRequest';
import salaryPaymentValidator from './salaryPayment.validator';
import salaryPaymentControllers from './salaryPayment.controllers';

const salaryPaymentRoutes = Router();
salaryPaymentRoutes.use(verifyAuth);
salaryPaymentRoutes.post('/', validateRequest(salaryPaymentValidator.createSchema), salaryPaymentControllers.create);
salaryPaymentRoutes.get('/', salaryPaymentControllers.readAll);

export default salaryPaymentRoutes;
