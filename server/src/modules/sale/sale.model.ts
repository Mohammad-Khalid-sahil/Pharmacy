import { Schema, model } from 'mongoose';
import { ISale } from './sale.interface';

const saleSchema = new Schema<ISale>(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: 'user' },
    product: { type: Schema.Types.ObjectId, required: true, ref: 'product' },
    customer: { type: Schema.Types.ObjectId, ref: 'customer' },
    buyerName: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    productPrice: { type: Number, required: true },
    purchasePrice: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    paymentType: { type: String, enum: ['CASH', 'CREDIT', 'PARTIAL'], default: 'CASH' },
    paidAmount: { type: Number, default: 0, min: 0 },
    transactionId: { type: Schema.Types.ObjectId, ref: 'transaction' },
    dueAmount: { type: Number, default: 0, min: 0 },
    date: { type: Date, required: true }
  },
  { timestamps: true }
);

saleSchema.index({ createdAt: -1 });
saleSchema.index({ user: 1, createdAt: -1 });
saleSchema.index({ customer: 1 }, { sparse: true });
saleSchema.index({ transactionId: 1 });
saleSchema.index({ date: -1 });

const Sale = model<ISale>('sale', saleSchema);
export default Sale;
