import { Router } from 'express';
import verifyAuth from '../../middlewares/verifyAuth';
import validateRequest from '../../middlewares/validateRequest';
import saleReturnValidator from './saleReturn.validator';
import saleReturnControllers from './saleReturn.controllers';

const saleReturnRoutes = Router();
saleReturnRoutes.use(verifyAuth);
saleReturnRoutes.post('/', validateRequest(saleReturnValidator.createSchema), saleReturnControllers.create);
saleReturnRoutes.get('/', saleReturnControllers.readAll);
saleReturnRoutes.get('/:id', saleReturnControllers.readSingle);

export default saleReturnRoutes;
