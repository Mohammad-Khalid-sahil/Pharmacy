import { Router } from 'express';
import verifyAuth from '../../middlewares/verifyAuth';
import sellerLedgerControllers from './sellerLedger.controllers';

const sellerLedgerRoutes = Router();
sellerLedgerRoutes.use(verifyAuth);
sellerLedgerRoutes.get('/balance/:sellerId', sellerLedgerControllers.getBalance);
sellerLedgerRoutes.get('/', sellerLedgerControllers.readAll);

export default sellerLedgerRoutes;
