import { Types } from 'mongoose';
import ActivityLog from './activityLog.model';
import sortAndPaginatePipeline from '../../lib/sortAndPaginate.pipeline';

class ActivityLogServices {
  async readAll(query: Record<string, unknown>) {
    const match: Record<string, unknown> = {};
    if (query.module) match.module = query.module;
    if (query.user) match.user = new Types.ObjectId(String(query.user));

    const data = await ActivityLog.aggregate([{ $match: match }, ...sortAndPaginatePipeline(query)]);
    const totalCount = await ActivityLog.countDocuments(match);
    return { data, totalCount };
  }
}

export default new ActivityLogServices();
