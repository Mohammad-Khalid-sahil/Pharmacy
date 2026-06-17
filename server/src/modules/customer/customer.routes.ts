import { Router } from 'express';
import verifyAuth from '../../middlewares/verifyAuth';
import validateRequest from '../../middlewares/validateRequest';
import customerValidator from './customer.validator';
import customerControllers from './customer.controllers';

const customerRoutes = Router();
customerRoutes.use(verifyAuth);

customerRoutes.post('/', validateRequest(customerValidator.createSchema), customerControllers.create);
customerRoutes.get('/', customerControllers.readAll);
customerRoutes.get('/:id/balance', customerControllers.getBalance);
customerRoutes.get('/:id', customerControllers.readSingle);
customerRoutes.patch('/:id', validateRequest(customerValidator.updateSchema), customerControllers.update);
customerRoutes.delete('/:id', customerControllers.delete);

export default customerRoutes;
