import { Types } from 'mongoose';

export interface ICustomerPayment {
  customer: Types.ObjectId;
  amount: number;
  paymentDate?: Date;
  note?: string;
  createdBy: Types.ObjectId;
}
