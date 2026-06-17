import { Schema, model } from 'mongoose';
import { RecordStatus } from '../../constant/ledgerTypes';
import { ICustomer } from './customer.interface';

const customerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    address: { type: String },
    note: { type: String },
    status: { type: String, enum: Object.values(RecordStatus), default: RecordStatus.ACTIVE },
    createdBy: { type: Schema.Types.ObjectId, required: true, ref: 'user' }
  },
  { timestamps: true }
);

customerSchema.index({ name: 1 });
customerSchema.index({ phone: 1 }, { sparse: true });
customerSchema.index({ createdBy: 1, name: 1 });

const Customer = model<ICustomer>('customer', customerSchema);
export default Customer;
