import { Schema, model } from 'mongoose';
import { IActivityLog } from './activityLog.interface';

const activityLogSchema = new Schema<IActivityLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'user' },
    action: { type: String, required: true, trim: true },
    module: { type: String, required: true, trim: true },
    recordId: { type: Schema.Types.ObjectId },
    oldData: { type: Schema.Types.Mixed },
    newData: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    description: { type: String }
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ user: 1, createdAt: -1 }, { sparse: true });
activityLogSchema.index({ module: 1, recordId: 1 });
activityLogSchema.index({ action: 1, module: 1 });

const ActivityLog = model<IActivityLog>('activityLog', activityLogSchema);
export default ActivityLog;
