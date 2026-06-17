import { Schema, model } from 'mongoose';
import { ICustomerDebtEntry, ICustomerDebtorAccount } from './customerDebtorAccount.interface';

const debtEntrySchema = new Schema<ICustomerDebtEntry>(
  {
    date: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    reason: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const customerDebtorAccountSchema = new Schema<ICustomerDebtorAccount>(
  {
    customerName: { type: String, required: true, trim: true },
    accountKey: { type: String, required: true, trim: true, lowercase: true },
    status: { type: String, enum: ['ACTIVE', 'SETTLED'], default: 'ACTIVE', index: true },
    accountNotes: { type: String, trim: true },
    debtEntries: { type: [debtEntrySchema], default: [] },
    settledAt: { type: Date },
    settlementTotalDebt: { type: Number, min: 0 },
    settlementReasonSummary: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'user', required: true, index: true },
  },
  { timestamps: true },
);

customerDebtorAccountSchema.index(
  { createdBy: 1, accountKey: 1 },
  { unique: true, partialFilterExpression: { status: 'ACTIVE' } },
);

const CustomerDebtorAccount = model<ICustomerDebtorAccount>('customerDebtorAccount', customerDebtorAccountSchema);
export default CustomerDebtorAccount;
