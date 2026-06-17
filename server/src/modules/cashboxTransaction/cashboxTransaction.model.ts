import { Schema, model } from 'mongoose';
import { CashboxDirection } from '../../constant/ledgerTypes';
import { ICashboxTransaction } from './cashboxTransaction.interface';

const cashboxTransactionSchema = new Schema<ICashboxTransaction>(
  {
    type: { type: String, required: true, trim: true },
    direction: { type: String, required: true, enum: Object.values(CashboxDirection) },
    amount: { type: Number, required: true, min: 0 },
    personName: { type: String, trim: true },
    personAccountKey: { type: String, trim: true, lowercase: true },
    transactionType: { type: String, enum: ['DEPOSIT', 'WITHDRAWAL'] },
    sourceModule: { type: String, trim: true },
    referenceId: { type: Schema.Types.ObjectId },
    relatedCustomer: { type: String, trim: true },
    relatedCashboxReference: { type: String, trim: true },
    description: { type: String },
    reason: { type: String, trim: true },
    actor: { type: String, trim: true },
    performedBy: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, required: true, ref: 'user' }
  },
  { timestamps: true }
);

cashboxTransactionSchema.index({ createdAt: -1, direction: 1 });
cashboxTransactionSchema.index({ createdBy: 1, createdAt: -1 });
cashboxTransactionSchema.index({ sourceModule: 1, referenceId: 1 }, { sparse: true });
cashboxTransactionSchema.index({ type: 1, direction: 1 });
cashboxTransactionSchema.index({ personName: 1, transactionType: 1, createdAt: -1 }, { sparse: true });
cashboxTransactionSchema.index({ createdBy: 1, personAccountKey: 1, createdAt: -1 }, { sparse: true });

const CashboxTransaction = model<ICashboxTransaction>('cashboxTransaction', cashboxTransactionSchema);
export default CashboxTransaction;
