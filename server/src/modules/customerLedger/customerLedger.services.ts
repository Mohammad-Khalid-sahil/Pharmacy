import { Types } from 'mongoose';
import CustomerLedger from './customerLedger.model';
import sortAndPaginatePipeline from '../../lib/sortAndPaginate.pipeline';

class CustomerLedgerServices {
  async readAll(query: Record<string, unknown>, userId: string) {
    const match: Record<string, unknown> = { createdBy: new Types.ObjectId(userId) };
    if (query.customer) match.customer = new Types.ObjectId(String(query.customer));

    const data = await CustomerLedger.aggregate([
      { $match: match },
      ...sortAndPaginatePipeline(query),
      {
        $lookup: {
          from: 'sales',
          localField: 'sale',
          foreignField: '_id',
          as: 'saleDoc'
        }
      },
      {
        $lookup: {
          from: 'customerpayments',
          localField: 'payment',
          foreignField: '_id',
          as: 'paymentDoc'
        }
      }
    ]);
    const totalCount = await CustomerLedger.countDocuments(match);
    return { data, totalCount };
  }
}

export default new CustomerLedgerServices();
