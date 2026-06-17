import { Types } from 'mongoose';

export type CustomerDebtorAccountStatus = 'ACTIVE' | 'SETTLED';

export interface ICustomerDebtEntry {
  _id?: Types.ObjectId;
  date: Date;
  amount: number;
  reason: string;
  notes?: string;
  createdAt?: Date;
}

export interface ICustomerDebtorAccount {
  customerName: string;
  accountKey: string;
  status: CustomerDebtorAccountStatus;
  accountNotes?: string;
  debtEntries: ICustomerDebtEntry[];
  settledAt?: Date;
  settlementTotalDebt?: number;
  settlementReasonSummary?: string;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}
