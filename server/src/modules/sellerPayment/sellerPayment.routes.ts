import { Router } from 'express';
import verifyAuth from '../../middlewares/verifyAuth';
import validateRequest from '../../middlewares/validateRequest';
import sellerPaymentValidator from './sellerPayment.validator';
import sellerPaymentControllers from './sellerPayment.controllers';

const sellerPaymentRoutes = Router();
sellerPaymentRoutes.use(verifyAuth);
sellerPaymentRoutes.post('/', validateRequest(sellerPaymentValidator.createSchema), sellerPaymentControllers.create);
sellerPaymentRoutes.get('/', sellerPaymentControllers.readAll);

export default sellerPaymentRoutes;
