import { Types } from 'mongoose';

export interface IMoneyTransfer {
  amount: number;
  toAccountOrPlace: string;
  transferDate?: Date;
  note?: string;
  createdBy: Types.ObjectId;
}
