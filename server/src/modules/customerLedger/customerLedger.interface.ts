import { Types } from 'mongoose';
import { TCustomerLedgerType } from '../../constant/ledgerTypes';

export interface ICustomerLedger {
  customer: Types.ObjectId;
  sale?: Types.ObjectId;
  payment?: Types.ObjectId;
  return?: Types.ObjectId;
  type: TCustomerLedgerType;
  amount: number;
  description?: string;
  createdBy: Types.ObjectId;
}
