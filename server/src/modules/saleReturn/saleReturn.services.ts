/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Types } from 'mongoose';
import SaleReturn from './saleReturn.model';
import Sale from '../sale/sale.model';
import Product from '../product/product.model';
import CustomerLedger from '../customerLedger/customerLedger.model';
import CashboxTransaction from '../cashboxTransaction/cashboxTransaction.model';
import { CustomerLedgerType, CashboxDirection } from '../../constant/ledgerTypes';
import CustomError from '../../errors/customError';
import sortAndPaginatePipeline from '../../lib/sortAndPaginate.pipeline';
import logActivity from '../../lib/logActivity';

class SaleReturnServices {
  private async getReturnedQuantityForProduct(saleId: string, productId: string) {
    const returns = await SaleReturn.find({ sale: saleId });
    return returns.reduce((acc, row) => {
      return (
        acc +
        row.items.reduce((itemAcc, item) => {
          return String(item.product) === String(productId) ? itemAcc + item.quantity : itemAcc;
        }, 0)
      );
    }, 0);
  }

  async create(payload: any, userId: string) {
    const sale = await Sale.findOne({ _id: payload.sale, user: userId });
    if (!sale) throw new CustomError(404, 'Sale is not found!');

    const saleProductId = String(sale.product);
    let returnQty = 0;

    for (const item of payload.items || []) {
      if (String(item.product) !== saleProductId) {
        throw new CustomError(400, 'Return product must match the original sale product');
      }
      returnQty += Number(item.quantity);
    }

    const alreadyReturned = await this.getReturnedQuantityForProduct(String(sale._id), saleProductId);
    const returnable = sale.quantity - alreadyReturned;

    if (returnQty < 1 || returnQty > returnable) {
      throw new CustomError(400, `Return quantity cannot exceed ${returnable} (sold ${sale.quantity}, already returned ${alreadyReturned})`);
    }

    const expectedRefund = Number(((sale.totalPrice / sale.quantity) * returnQty).toFixed(2));
    if (Math.abs(Number(payload.totalRefund) - expectedRefund) > 0.01) {
      throw new CustomError(400, 'Total refund does not match returned quantity');
    }

    return this.createWithOptionalTransaction(payload, userId, sale);
  }

  private isTransactionUnsupported(error: unknown) {
    const err = error as { code?: number; message?: string };
    return (
      err?.code === 20 ||
      Boolean(err?.message?.includes('Transaction numbers are only allowed')) ||
      Boolean(err?.message?.includes('replica set'))
    );
  }

  private async persistReturn(
    payload: any,
    userId: string,
    sale: { _id: Types.ObjectId; customer?: Types.ObjectId; paymentType?: string; dueAmount?: number },
    settlement: { creditDebt: number; cashRefund: number },
    session?: mongoose.ClientSession
  ) {
    const opts = session ? { session } : undefined;

    for (const item of payload.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } }, opts);
    }

    const created = session
      ? await SaleReturn.create(
          [{ ...payload, createdBy: userId, customer: payload.customer || sale.customer }],
          { session }
        )
      : await SaleReturn.create({ ...payload, createdBy: userId, customer: payload.customer || sale.customer });

    const saleReturn = Array.isArray(created) ? created[0] : created;

    if (saleReturn.customer && settlement.creditDebt > 0) {
      await CustomerLedger.create(
        [
          {
            customer: saleReturn.customer,
            sale: sale._id,
            return: saleReturn._id,
            type: CustomerLedgerType.CREDIT,
            amount: settlement.creditDebt,
            description: payload.reason || 'Sale return refund',
            createdBy: userId
          }
        ],
        opts
      );
    }

    if (settlement.cashRefund > 0) {
      await CashboxTransaction.create(
        [
          {
            type: 'SALE_RETURN',
            direction: CashboxDirection.OUT,
            amount: settlement.cashRefund,
            sourceModule: 'saleReturn',
            referenceId: saleReturn._id,
            description: 'Sale return refund',
            createdBy: userId
          }
        ],
        opts
      );
    }

    return saleReturn;
  }

  private async getCustomerBalance(customer: string | Types.ObjectId, userId: string) {
    const rows = await CustomerLedger.aggregate([
      { $match: { customer: new Types.ObjectId(customer), createdBy: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          debit: { $sum: { $cond: [{ $eq: ['$type', CustomerLedgerType.DEBIT] }, '$amount', 0] } },
          credit: { $sum: { $cond: [{ $in: ['$type', [CustomerLedgerType.CREDIT, CustomerLedgerType.ADJUSTMENT]] }, '$amount', 0] } }
        }
      }
    ]);

    return (rows[0]?.debit || 0) - (rows[0]?.credit || 0);
  }

  private async getPriorReturnDebtCredits(saleId: Types.ObjectId) {
    const rows = await CustomerLedger.aggregate([
      {
        $match: {
          sale: saleId,
          return: { $exists: true },
          type: CustomerLedgerType.CREDIT
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    return rows[0]?.total || 0;
  }

  private async getSettlement(sale: any, payload: any, userId: string) {
    const totalRefund = Number(payload.totalRefund || 0);
    const customer = payload.customer || sale.customer;
    const paymentType = sale.paymentType || (Number(sale.dueAmount || 0) > 0 ? 'CREDIT' : 'CASH');

    if (!customer || paymentType === 'CASH') {
      return { creditDebt: 0, cashRefund: totalRefund };
    }

    const customerBalance = Math.max(await this.getCustomerBalance(customer, userId), 0);
    const priorReturnDebtCredits = await this.getPriorReturnDebtCredits(sale._id);
    const remainingSaleDebt = Math.max(Number(sale.dueAmount || 0) - priorReturnDebtCredits, 0);
    const creditDebt = Math.min(totalRefund, customerBalance, remainingSaleDebt);

    return { creditDebt, cashRefund: totalRefund - creditDebt };
  }

  private async createWithOptionalTransaction(payload: any, userId: string, sale: any) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const settlement = await this.getSettlement(sale, payload, userId);
      const saleReturn = await this.persistReturn(payload, userId, sale, settlement, session);
      await session.commitTransaction();
      await logActivity({
        userId,
        action: 'STOCK_RETURN',
        module: 'stock',
        recordId: String(sale.product),
        newData: { items: payload.items, return: saleReturn._id, totalRefund: payload.totalRefund },
        description: 'Sale return stock restored'
      });
      return saleReturn;
    } catch (error) {
      try {
        await session.abortTransaction();
      } catch {
        /* noop */
      }
      if (this.isTransactionUnsupported(error)) {
        const settlement = await this.getSettlement(sale, payload, userId);
        const saleReturn = await this.persistReturn(payload, userId, sale, settlement);
        await logActivity({
          userId,
          action: 'STOCK_RETURN',
          module: 'stock',
          recordId: String(sale.product),
          newData: { items: payload.items, return: saleReturn._id, totalRefund: payload.totalRefund },
          description: 'Sale return stock restored'
        });
        return saleReturn;
      }
      throw new CustomError(400, error instanceof Error ? error.message : 'Sale return failed');
    } finally {
      session.endSession();
    }
  }

  async readAll(query: Record<string, unknown>, userId: string) {
    const match: Record<string, unknown> = { createdBy: new Types.ObjectId(userId) };
    if (query.sale) {
      match.sale = new Types.ObjectId(String(query.sale));
    }

    const data = await SaleReturn.aggregate([
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
        $addFields: {
          sale: { $arrayElemAt: ['$saleDoc', 0] }
        }
      },
      { $project: { saleDoc: 0 } }
    ]);
    const totalCount = await SaleReturn.countDocuments(match);
    return { data, totalCount };
  }

  async read(id: string, userId: string) {
    const doc = await SaleReturn.findOne({ _id: id, createdBy: userId }).populate('sale').populate('customer', 'name phone');
    if (!doc) throw new CustomError(404, 'Sale return is not found!');
    return doc;
  }
}

export default new SaleReturnServices();
