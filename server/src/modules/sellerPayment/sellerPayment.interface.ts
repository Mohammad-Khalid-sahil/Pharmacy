import { Types } from 'mongoose';

export interface ISellerPayment {
  seller: Types.ObjectId;
  amount: number;
  paymentDate?: Date;
  note?: string;
  createdBy: Types.ObjectId;
}
