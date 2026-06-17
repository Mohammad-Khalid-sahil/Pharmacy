import { Schema, model } from 'mongoose';
import { RecordStatus } from '../../constant/ledgerTypes';
import { IEmployee } from './employee.interface';

const employeeSchema = new Schema<IEmployee>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    position: { type: String, trim: true },
    salary: { type: Number, min: 0 },
    address: { type: String },
    note: { type: String },
    status: { type: String, enum: Object.values(RecordStatus), default: RecordStatus.ACTIVE },
    createdBy: { type: Schema.Types.ObjectId, required: true, ref: 'user' }
  },
  { timestamps: true }
);

employeeSchema.index({ name: 1 });
employeeSchema.index({ createdBy: 1, status: 1 });
employeeSchema.index({ phone: 1 }, { sparse: true });

const Employee = model<IEmployee>('employee', employeeSchema);
export default Employee;
