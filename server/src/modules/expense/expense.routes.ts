import { Router } from 'express';
import verifyAuth from '../../middlewares/verifyAuth';
import validateRequest from '../../middlewares/validateRequest';
import expenseValidator from './expense.validator';
import expenseController from './expense.controllers';

const expenseRoutes = Router();

expenseRoutes.use(verifyAuth);
expenseRoutes.post('/', validateRequest(expenseValidator.createSchema), expenseController.create);
expenseRoutes.get('/', expenseController.getAll);
expenseRoutes.patch('/:id', validateRequest(expenseValidator.updateSchema), expenseController.update);
expenseRoutes.delete('/:id', expenseController.delete);

export default expenseRoutes;
