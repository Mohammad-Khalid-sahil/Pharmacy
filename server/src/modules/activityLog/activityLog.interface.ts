import { Types } from 'mongoose';

export interface IActivityLog {
  user?: Types.ObjectId;
  action: string;
  module: string;
  recordId?: Types.ObjectId;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  ipAddress?: string;
  description?: string;
}
