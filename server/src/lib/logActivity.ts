import { Types } from 'mongoose';
import ActivityLog from '../modules/activityLog/activityLog.model';

type LogActivityInput = {
  userId?: string;
  action: string;
  module: string;
  recordId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  ipAddress?: string;
  description?: string;
};

const logActivity = async (input: LogActivityInput) => {
  try {
    await ActivityLog.create({
      user: input.userId ? new Types.ObjectId(input.userId) : undefined,
      action: input.action,
      module: input.module,
      recordId: input.recordId ? new Types.ObjectId(input.recordId) : undefined,
      oldData: input.oldData,
      newData: input.newData,
      ipAddress: input.ipAddress,
      description: input.description
    });
  } catch (error) {
    console.error('Activity log failed:', error);
  }
};

export default logActivity;
