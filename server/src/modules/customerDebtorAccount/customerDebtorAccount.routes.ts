import { Router } from 'express';
import verifyAuth from '../../middlewares/verifyAuth';
import validateRequest from '../../middlewares/validateRequest';
import customerDebtorAccountValidator from './customerDebtorAccount.validator';
import customerDebtorAccountControllers from './customerDebtorAccount.controllers';

const customerDebtorAccountRoutes = Router();
customerDebtorAccountRoutes.use(verifyAuth);

customerDebtorAccountRoutes.get('/', customerDebtorAccountControllers.readAll);
customerDebtorAccountRoutes.post('/debt', validateRequest(customerDebtorAccountValidator.addDebtSchema), customerDebtorAccountControllers.addDebt);
customerDebtorAccountRoutes.post('/:id/settle', customerDebtorAccountControllers.settle);
customerDebtorAccountRoutes.get('/:id', customerDebtorAccountControllers.readSingle);

export default customerDebtorAccountRoutes;
