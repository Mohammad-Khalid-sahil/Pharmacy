import { Router } from 'express';
import verifyAuth from '../../middlewares/verifyAuth';
import validateRequest from '../../middlewares/validateRequest';
import cashboxPersonAccountValidator from './cashboxPersonAccount.validator';
import cashboxPersonAccountControllers from './cashboxPersonAccount.controllers';

const cashboxPersonAccountRoutes = Router();
cashboxPersonAccountRoutes.use(verifyAuth);

cashboxPersonAccountRoutes.get('/', cashboxPersonAccountControllers.readAll);
cashboxPersonAccountRoutes.post(
  '/transaction',
  validateRequest(cashboxPersonAccountValidator.addTransactionSchema),
  cashboxPersonAccountControllers.addTransaction,
);
cashboxPersonAccountRoutes.get('/:id', cashboxPersonAccountControllers.readSingle);

export default cashboxPersonAccountRoutes;
