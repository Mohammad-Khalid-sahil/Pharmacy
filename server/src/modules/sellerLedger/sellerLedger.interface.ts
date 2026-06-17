import { Types } from 'mongoose';
import { TSellerLedgerType } from '../../constant/ledgerTypes';

export interface ISellerLedger {
  seller: Types.ObjectId;
  purchase?: Types.ObjectId;
  payment?: Types.ObjectId;
  type: TSellerLedgerType;
  debit?: number;
  credit?: number;
  amount: number;
  description?: string;
  createdBy: Types.ObjectId;
}
