/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { Types } from 'mongoose';
import SellerPayment from './sellerPayment.model';
import SellerLedger from '../sellerLedger/sellerLedger.model';
import CashboxTransaction from '../cashboxTransaction/cashboxTransaction.model';
import Seller from '../seller/seller.model';
import { SellerLedgerType, CashboxDirection } from '../../constant/ledgerTypes';
import CustomError from '../../errors/customError';
import sortAndPaginatePipeline from '../../lib/sortAndPaginate.pipeline';

class SellerPaymentServices {
  private isTransactionUnsupported(error: unknown) {
    const err = error as { code?: number; message?: string };
    return (
      err?.code === 20 ||
      Boolean(err?.message?.includes('Transaction numbers are only allowed')) ||
      Boolean(err?.message?.includes('replica set'))
    );
  }

  private async persistPayment(payload: any, userId: string, seller: { name: string }, session?: mongoose.ClientSession) {
    const opts = session ? { session } : undefined;
    const created = await SellerPayment.create(
      [{ ...payload, createdBy: userId, paymentDate: payload.paymentDate || new Date() }],
      opts
    );
    const payment = Array.isArray(created) ? created[0] : created;

    await SellerLedger.create(
      [
        {
          seller: payment.seller,
          payment: payment._id,
          type: SellerLedgerType.PAYMENT,
          amount: payment.amount,
          credit: payment.amount,
          description: payload.note || 'Payment to supplier',
          createdBy: userId
        }
      ],
      opts
    );

    await CashboxTransaction.create(
      [
        {
          type: 'SELLER_PAYMENT',
          direction: CashboxDirection.OUT,
          amount: payment.amount,
          sourceModule: 'sellerPayment',
          referenceId: payment._id,
          description: `Payment to ${seller.name}`,
          createdBy: userId
        }
      ],
      opts
    );

    return payment;
  }

  async create(payload: any, userId: string) {
    const seller = await Seller.findOne({ _id: payload.seller, user: userId });
    if (!seller) throw new CustomError(404, 'Seller is not found!');
    const balanceRows = await SellerLedger.aggregate([
      { $match: { seller: new Types.ObjectId(payload.seller), createdBy: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          purchases: { $sum: { $cond: [{ $eq: ['$type', SellerLedgerType.PURCHASE] }, '$amount', 0] } },
          credit: { $sum: '$credit' }
        }
      }
    ]);
    const balance = (balanceRows[0]?.purchases || 0) - (balanceRows[0]?.credit || 0);
    if (Number(payload.amount) > balance) throw new CustomError(400, 'Payment cannot exceed seller payable');

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const payment = await this.persistPayment(payload, userId, seller, session);
      await session.commitTransaction();
      return payment;
    } catch (error) {
      try {
        await session.abortTransaction();
      } catch {
        /* no active transaction */
      }

      if (this.isTransactionUnsupported(error)) {
        return this.persistPayment(payload, userId, seller);
      }

      throw new CustomError(400, 'Seller payment failed');
    } finally {
      await session.endSession();
    }
  }

  async readAll(query: Record<string, unknown>, userId: string) {
    const sellers = await Seller.find({ user: userId }).select('_id');
    const sellerIds = sellers.map((s) => s._id);
    const match: Record<string, unknown> = { createdBy: new Types.ObjectId(userId), seller: { $in: sellerIds } };
    if (query.seller) match.seller = new Types.ObjectId(String(query.seller));

    const data = await SellerPayment.aggregate([{ $match: match }, ...sortAndPaginatePipeline(query)]);
    const totalCount = await SellerPayment.countDocuments(match);
    return { data, totalCount };
  }
}

export default new SellerPaymentServices();
