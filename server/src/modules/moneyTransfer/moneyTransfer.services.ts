/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import MoneyTransfer from './moneyTransfer.model';
import CashboxTransaction from '../cashboxTransaction/cashboxTransaction.model';
import { CashboxDirection } from '../../constant/ledgerTypes';
import CustomError from '../../errors/customError';
import sortAndPaginatePipeline from '../../lib/sortAndPaginate.pipeline';
import { Types } from 'mongoose';

class MoneyTransferServices {
  async create(payload: any, userId: string) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const [transfer] = await MoneyTransfer.create(
        [{ ...payload, createdBy: userId, transferDate: payload.transferDate || new Date() }],
        { session }
      );

      await CashboxTransaction.create(
        [
          {
            type: 'MONEY_TRANSFER',
            direction: CashboxDirection.OUT,
            amount: transfer.amount,
            sourceModule: 'moneyTransfer',
            referenceId: transfer._id,
            description: `Transfer to ${transfer.toAccountOrPlace}`,
            createdBy: userId
          }
        ],
        { session }
      );

      await session.commitTransaction();
      return transfer;
    } catch {
      await session.abortTransaction();
      throw new CustomError(400, 'Money transfer failed');
    } finally {
      session.endSession();
    }
  }

  async readAll(query: Record<string, unknown>, userId: string) {
    const match = { createdBy: new Types.ObjectId(userId) };
    const data = await MoneyTransfer.aggregate([{ $match: match }, ...sortAndPaginatePipeline(query)]);
    const totalCount = await MoneyTransfer.countDocuments(match);
    return { data, totalCount };
  }
}

export default new MoneyTransferServices();
