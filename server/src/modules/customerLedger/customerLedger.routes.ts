import { Router } from 'express';
import verifyAuth from '../../middlewares/verifyAuth';
import customerLedgerControllers from './customerLedger.controllers';

const customerLedgerRoutes = Router();
customerLedgerRoutes.use(verifyAuth);
customerLedgerRoutes.get('/', customerLedgerControllers.readAll);

export default customerLedgerRoutes;
