import { Schema, model } from 'mongoose';
import { ICashboxPersonAccount, ICashboxPersonAccountTransaction } from './cashboxPersonAccount.interface';

const personAccountTransactionSchema = new Schema<ICashboxPersonAccountTransaction>(
  {
    personName: { type: String, trim: true },
    date: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    transactionType: { type: String, enum: ['DEPOSIT', 'WITHDRAWAL'], required: true },
    reason: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const cashboxPersonAccountSchema = new Schema<ICashboxPersonAccount>(
  {
    personName: { type: String, required: true, trim: true },
    accountKey: { type: String, required: true, trim: true, lowercase: true },
    transactions: { type: [personAccountTransactionSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'user', required: true, index: true },
  },
  { timestamps: true },
);

cashboxPersonAccountSchema.index({ createdBy: 1, accountKey: 1 }, { unique: true });
cashboxPersonAccountSchema.index({ createdBy: 1, personName: 1 });

const CashboxPersonAccount = model<ICashboxPersonAccount>('cashboxPersonAccount', cashboxPersonAccountSchema);
export default CashboxPersonAccount;
