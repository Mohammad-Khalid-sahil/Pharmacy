import { Types } from 'mongoose';
import { TCashboxDirection } from '../../constant/ledgerTypes';

export interface ICashboxTransaction {
  type: string;
  direction: TCashboxDirection;
  amount: number;
  personName?: string;
  personAccountKey?: string;
  transactionType?: 'DEPOSIT' | 'WITHDRAWAL';
  sourceModule?: string;
  referenceId?: Types.ObjectId;
  relatedCustomer?: string;
  relatedCashboxReference?: string;
  description?: string;
  reason?: string;
  actor?: string;
  performedBy?: string;
  createdBy: Types.ObjectId;
}
