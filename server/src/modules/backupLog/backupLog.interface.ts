import { Types } from 'mongoose';

export interface IBackupLog {
  fileName: string;
  filePath: string;
  size?: number;
  createdBy: Types.ObjectId;
}
