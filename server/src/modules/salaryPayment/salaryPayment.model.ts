import { Schema, model } from 'mongoose';
import { ISalaryPayment } from './salaryPayment.interface';

const salaryPaymentSchema = new Schema<ISalaryPayment>(
  {
    employee: { type: Schema.Types.ObjectId, required: true, ref: 'employee' },
    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, default: Date.now },
    note: { type: String },
    createdBy: { type: Schema.Types.ObjectId, required: true, ref: 'user' }
  },
  { timestamps: true }
);

salaryPaymentSchema.index({ employee: 1, paymentDate: -1 });
salaryPaymentSchema.index({ createdBy: 1, paymentDate: -1 });

const SalaryPayment = model<ISalaryPayment>('salaryPayment', salaryPaymentSchema);
export default SalaryPayment;
