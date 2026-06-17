import { model, Schema } from 'mongoose';
import { IPurchase } from './purchase.interface';

const purchaseSchema = new Schema<IPurchase>(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: 'user' },
    seller: { type: Schema.Types.ObjectId, required: true, ref: 'seller' },
    product: { type: Schema.Types.ObjectId, required: true, ref: 'product' },
    sellerName: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    paid: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['PAID', 'PARTIAL', 'UNPAID'], default: 'UNPAID' },
    purchaseDate: { type: Date }
  },
  { timestamps: true }
);

purchaseSchema.index({ createdAt: -1 });
purchaseSchema.index({ user: 1, createdAt: -1 });
purchaseSchema.index({ seller: 1, createdAt: -1 });

const Purchase = model<IPurchase>('purchase', purchaseSchema);
export default Purchase;
