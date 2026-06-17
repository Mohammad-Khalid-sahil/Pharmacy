import { Schema, model } from 'mongoose';
import { IMoneyTransfer } from './moneyTransfer.interface';

const moneyTransferSchema = new Schema<IMoneyTransfer>(
  {
    amount: { type: Number, required: true, min: 0 },
    toAccountOrPlace: { type: String, required: true, trim: true },
    transferDate: { type: Date, default: Date.now },
    note: { type: String },
    createdBy: { type: Schema.Types.ObjectId, required: true, ref: 'user' }
  },
  { timestamps: true }
);

moneyTransferSchema.index({ createdBy: 1, transferDate: -1 });
moneyTransferSchema.index({ transferDate: -1 });

const MoneyTransfer = model<IMoneyTransfer>('moneyTransfer', moneyTransferSchema);
export default MoneyTransfer;
