import { Router } from 'express';
import verifyAuth from '../../middlewares/verifyAuth';
import validateRequest from '../../middlewares/validateRequest';
import moneyTransferValidator from './moneyTransfer.validator';
import moneyTransferControllers from './moneyTransfer.controllers';

const moneyTransferRoutes = Router();
moneyTransferRoutes.use(verifyAuth);
moneyTransferRoutes.post('/', validateRequest(moneyTransferValidator.createSchema), moneyTransferControllers.create);
moneyTransferRoutes.get('/', moneyTransferControllers.readAll);

export default moneyTransferRoutes;
