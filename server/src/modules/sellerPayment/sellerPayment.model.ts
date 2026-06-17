import { Schema, model } from 'mongoose';
import { ISellerPayment } from './sellerPayment.interface';

const sellerPaymentSchema = new Schema<ISellerPayment>(
  {
    seller: { type: Schema.Types.ObjectId, required: true, ref: 'Seller' },
    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, default: Date.now },
    note: { type: String },
    createdBy: { type: Schema.Types.ObjectId, required: true, ref: 'user' }
  },
  { timestamps: true }
);

sellerPaymentSchema.index({ seller: 1, createdAt: -1 });
sellerPaymentSchema.index({ createdBy: 1, paymentDate: -1 });

const SellerPayment = model<ISellerPayment>('sellerPayment', sellerPaymentSchema);
export default SellerPayment;
