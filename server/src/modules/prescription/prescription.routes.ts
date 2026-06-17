import { Router } from 'express';
import verifyAuth from '../../middlewares/verifyAuth';
import validateRequest from '../../middlewares/validateRequest';
import prescriptionValidator from './prescription.validator';
import prescriptionControllers from './prescription.controllers';

const prescriptionRoutes = Router();
prescriptionRoutes.use(verifyAuth);
prescriptionRoutes.post('/', validateRequest(prescriptionValidator.createSchema), prescriptionControllers.create);
prescriptionRoutes.get('/', prescriptionControllers.readAll);
prescriptionRoutes.get('/:id', prescriptionControllers.readSingle);
prescriptionRoutes.delete('/:id', prescriptionControllers.delete);

export default prescriptionRoutes;
