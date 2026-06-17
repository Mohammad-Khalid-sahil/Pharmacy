import { Types } from 'mongoose';

export type PersonAccountTransactionType = 'DEPOSIT' | 'WITHDRAWAL';

export interface ICashboxPersonAccountTransaction {
  _id?: Types.ObjectId;
  personName?: string;
  date: Date;
  amount: number;
  transactionType: PersonAccountTransactionType;
  reason?: string;
  notes?: string;
  createdAt?: Date;
}

export interface ICashboxPersonAccount {
  personName: string;
  accountKey: string;
  transactions: ICashboxPersonAccountTransaction[];
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}
