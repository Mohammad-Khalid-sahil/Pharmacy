import { Types } from 'mongoose';

export interface ISalaryPayment {
  employee: Types.ObjectId;
  amount: number;
  paymentDate?: Date;
  note?: string;
  createdBy: Types.ObjectId;
}
