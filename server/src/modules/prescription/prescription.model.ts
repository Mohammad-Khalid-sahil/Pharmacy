import { Schema, model } from 'mongoose';
import { IPrescription, IPrescriptionItem } from './prescription.interface';

const prescriptionItemSchema = new Schema<IPrescriptionItem>(
  {
    product: { type: Schema.Types.ObjectId, required: true, ref: 'product' },
    quantity: { type: Number, required: true, min: 1 },
    dosage: { type: String },
    instruction: { type: String }
  },
  { _id: false }
);

const prescriptionSchema = new Schema<IPrescription>(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'customer' },
    doctorName: { type: String, trim: true },
    patientName: { type: String, trim: true },
    note: { type: String },
    sale: { type: Schema.Types.ObjectId, ref: 'sale' },
    items: { type: [prescriptionItemSchema], required: true, validate: [(v: IPrescriptionItem[]) => v.length > 0, 'At least one prescription item is required'] },
    totalAmount: { type: Number, required: true, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, required: true, ref: 'user' }
  },
  { timestamps: true }
);

prescriptionSchema.index({ customer: 1, createdAt: -1 }, { sparse: true });
prescriptionSchema.index({ sale: 1 }, { sparse: true });
prescriptionSchema.index({ createdBy: 1, createdAt: -1 });
prescriptionSchema.index({ patientName: 1 }, { sparse: true });

const Prescription = model<IPrescription>('prescription', prescriptionSchema);
export default Prescription;
