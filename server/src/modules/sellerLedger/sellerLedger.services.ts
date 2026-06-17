import { Types } from 'mongoose';
import Seller from '../seller/seller.model';
import SellerLedger from './sellerLedger.model';
import { SellerLedgerType } from '../../constant/ledgerTypes';
import sortAndPaginatePipeline from '../../lib/sortAndPaginate.pipeline';
import CustomError from '../../errors/customError';

class SellerLedgerServices {
  async readAll(query: Record<string, unknown>, userId: string) {
    const match: Record<string, unknown> = { createdBy: new Types.ObjectId(userId) };
    if (query.seller) match.seller = new Types.ObjectId(String(query.seller));

    const data = await SellerLedger.aggregate([{ $match: match }, ...sortAndPaginatePipeline(query)]);
    const totalCount = await SellerLedger.countDocuments(match);
    return { data, totalCount };
  }

  async getBalance(sellerId: string, userId: string) {
    const seller = await Seller.findOne({ _id: sellerId, user: userId });
    if (!seller) throw new CustomError(404, 'Seller is not found!');

    const rows = await SellerLedger.aggregate([
      { $match: { seller: new Types.ObjectId(sellerId), createdBy: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          purchases: {
            $sum: { $cond: [{ $eq: ['$type', SellerLedgerType.PURCHASE] }, '$amount', 0] }
          },
          payments: {
            $sum: '$credit'
          },
          credit: { $sum: '$credit' }
        }
      }
    ]);

    const purchases = rows[0]?.purchases || 0;
    const payments = rows[0]?.payments || 0;
    return { purchases, payments, balance: purchases - payments };
  }
}

export default new SellerLedgerServices();
