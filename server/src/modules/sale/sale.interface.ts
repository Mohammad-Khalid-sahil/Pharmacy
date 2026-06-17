import { Types } from 'mongoose';

export interface ISale {
  user: Types.ObjectId;
  product: Types.ObjectId;
  transactionId?: Types.ObjectId;
  customer?: Types.ObjectId;
  productName: string;
  productPrice: number;
  purchasePrice?: number;
  profit?: number;
  paymentType?: 'CASH' | 'CREDIT' | 'PARTIAL';
  paidAmount?: number;
  dueAmount?: number;
  quantity: number;
  buyerName: string;
  date: Date;
  totalPrice: number;
}
