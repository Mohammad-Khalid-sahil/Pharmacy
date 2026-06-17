import { Schema, model } from 'mongoose';
import { ISaleReturn, ISaleReturnItem } from './saleReturn.interface';

const saleReturnItemSchema = new Schema<ISaleReturnItem>(
  {
    product: { type: Schema.Types.ObjectId, required: true, ref: 'product' },
    quantity: { type: Number, required: true, min: 1 },
    refundAmount: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const saleReturnSchema = new Schema<ISaleReturn>(
  {
    sale: { type: Schema.Types.ObjectId, required: true, ref: 'sale' },
    customer: { type: Schema.Types.ObjectId, ref: 'customer' },
    items: { type: [saleReturnItemSchema], required: true, validate: [(v: ISaleReturnItem[]) => v.length > 0, 'At least one return item is required'] },
    totalRefund: { type: Number, required: true, min: 0 },
    reason: { type: String },
    note: { type: String },
    createdBy: { type: Schema.Types.ObjectId, required: true, ref: 'user' }
  },
  { timestamps: true }
);

saleReturnSchema.index({ sale: 1 });
saleReturnSchema.index({ customer: 1, createdAt: -1 }, { sparse: true });
saleReturnSchema.index({ createdBy: 1, createdAt: -1 });

const SaleReturn = model<ISaleReturn>('saleReturn', saleReturnSchema);
export default SaleReturn;
