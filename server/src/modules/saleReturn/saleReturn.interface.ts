import { Types } from 'mongoose';

export interface ISaleReturnItem {
  product: Types.ObjectId;
  quantity: number;
  refundAmount: number;
}

export interface ISaleReturn {
  sale: Types.ObjectId;
  customer?: Types.ObjectId;
  items: ISaleReturnItem[];
  totalRefund: number;
  reason?: string;
  note?: string;
  createdBy: Types.ObjectId;
}
