import { Schema, model } from 'mongoose';
import { IBackupLog } from './backupLog.interface';

const backupLogSchema = new Schema<IBackupLog>(
  {
    fileName: { type: String, required: true, trim: true },
    filePath: { type: String, required: true, trim: true },
    size: { type: Number, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, required: true, ref: 'user' }
  },
  { timestamps: true }
);

backupLogSchema.index({ createdBy: 1, createdAt: -1 });
backupLogSchema.index({ fileName: 1 });

const BackupLog = model<IBackupLog>('backupLog', backupLogSchema);
export default BackupLog;
