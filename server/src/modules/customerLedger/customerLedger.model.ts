import { Schema, model } from 'mongoose';
import { CustomerLedgerType } from '../../constant/ledgerTypes';
import { ICustomerLedger } from './customerLedger.interface';

const customerLedgerSchema = new Schema<ICustomerLedger>(
  {
    customer: { type: Schema.Types.ObjectId, required: true, ref: 'customer' },
    sale: { type: Schema.Types.ObjectId, ref: 'sale' },
    payment: { type: Schema.Types.ObjectId, ref: 'customerPayment' },
    return: { type: Schema.Types.ObjectId, ref: 'saleReturn' },
    type: { type: String, required: true, enum: Object.values(CustomerLedgerType) },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String },
    createdBy: { type: Schema.Types.ObjectId, required: true, ref: 'user' }
  },
  { timestamps: true }
);

customerLedgerSchema.index({ customer: 1, createdAt: -1 });
customerLedgerSchema.index({ sale: 1 }, { sparse: true });
customerLedgerSchema.index({ payment: 1 }, { sparse: true });
customerLedgerSchema.index({ createdBy: 1, type: 1 });

const CustomerLedger = model<ICustomerLedger>('customerLedger', customerLedgerSchema);
export default CustomerLedger;
