import { Schema, model } from 'mongoose';
import { SellerLedgerType } from '../../constant/ledgerTypes';
import { ISellerLedger } from './sellerLedger.interface';

const sellerLedgerSchema = new Schema<ISellerLedger>(
  {
    seller: { type: Schema.Types.ObjectId, required: true, ref: 'Seller' },
    purchase: { type: Schema.Types.ObjectId, ref: 'purchase' },
    payment: { type: Schema.Types.ObjectId, ref: 'sellerPayment' },
    type: { type: String, required: true, enum: Object.values(SellerLedgerType) },
    debit: { type: Number, min: 0 },
    credit: { type: Number, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String },
    createdBy: { type: Schema.Types.ObjectId, required: true, ref: 'user' }
  },
  { timestamps: true }
);

sellerLedgerSchema.index({ seller: 1, createdAt: -1 });
sellerLedgerSchema.index({ purchase: 1 }, { sparse: true });
sellerLedgerSchema.index({ payment: 1 }, { sparse: true });
sellerLedgerSchema.index({ createdBy: 1, type: 1 });

const SellerLedger = model<ISellerLedger>('sellerLedger', sellerLedgerSchema);
export default SellerLedger;
