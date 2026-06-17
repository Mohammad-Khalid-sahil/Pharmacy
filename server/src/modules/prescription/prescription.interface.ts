import { Types } from 'mongoose';

export interface IPrescriptionItem {
  product: Types.ObjectId;
  quantity: number;
  dosage?: string;
  instruction?: string;
}

export interface IPrescription {
  customer?: Types.ObjectId;
  doctorName?: string;
  patientName?: string;
  note?: string;
  sale?: Types.ObjectId;
  items: IPrescriptionItem[];
  totalAmount: number;
  createdBy: Types.ObjectId;
}
