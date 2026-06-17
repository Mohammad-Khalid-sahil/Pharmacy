import { Router } from 'express';
import verifyAuth from '../../middlewares/verifyAuth';
import validateRequest from '../../middlewares/validateRequest';
import employeeValidator from './employee.validator';
import employeeControllers from './employee.controllers';

const employeeRoutes = Router();
employeeRoutes.use(verifyAuth);
employeeRoutes.post('/', validateRequest(employeeValidator.createSchema), employeeControllers.create);
employeeRoutes.get('/', employeeControllers.readAll);
employeeRoutes.get('/:id', employeeControllers.readSingle);
employeeRoutes.patch('/:id', validateRequest(employeeValidator.updateSchema), employeeControllers.update);
employeeRoutes.delete('/:id', employeeControllers.delete);

export default employeeRoutes;
