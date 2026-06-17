import { Schema, model } from 'mongoose';
import { ICustomerPayment } from './customerPayment.interface';

const customerPaymentSchema = new Schema<ICustomerPayment>(
  {
    customer: { type: Schema.Types.ObjectId, required: true, ref: 'customer' },
    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, default: Date.now },
    note: { type: String },
    createdBy: { type: Schema.Types.ObjectId, required: true, ref: 'user' }
  },
  { timestamps: true }
);

customerPaymentSchema.index({ customer: 1, createdAt: -1 });
customerPaymentSchema.index({ createdBy: 1, paymentDate: -1 });

const CustomerPayment = model<ICustomerPayment>('customerPayment', customerPaymentSchema);
export default CustomerPayment;
