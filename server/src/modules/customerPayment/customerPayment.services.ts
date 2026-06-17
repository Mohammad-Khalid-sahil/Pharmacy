/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Types } from 'mongoose';
import CustomerPayment from './customerPayment.model';
import CustomerLedger from '../customerLedger/customerLedger.model';
import CashboxTransaction from '../cashboxTransaction/cashboxTransaction.model';
import Customer from '../customer/customer.model';
import Sale from '../sale/sale.model';
import { CustomerLedgerType, CashboxDirection } from '../../constant/ledgerTypes';
import CustomError from '../../errors/customError';
import sortAndPaginatePipeline from '../../lib/sortAndPaginate.pipeline';

class CustomerPaymentServices {
  private isTransactionUnsupported(error: unknown) {
    const err = error as { code?: number; message?: string };
    return (
      err?.code === 20 ||
      Boolean(err?.message?.includes('Transaction numbers are only allowed')) ||
      Boolean(err?.message?.includes('replica set'))
    );
  }

  private async applyPaymentToSales(
    customerId: string,
    userId: string,
    amount: number,
    session?: mongoose.ClientSession,
  ) {
    const opts = session ? { session } : undefined;
    let remaining = Number(amount);

    const openSales = await Sale.find({
      customer: customerId,
      user: userId,
      dueAmount: { $gt: 0 },
    })
      .sort({ date: 1, createdAt: 1 })
      .session(session || null);

    for (const sale of openSales) {
      if (remaining <= 0) break;
      const due = Number(sale.dueAmount || 0);
      const applied = Math.min(due, remaining);
      sale.dueAmount = due - applied;
      sale.paidAmount = Number(sale.paidAmount || 0) + applied;
      await sale.save(opts);
      remaining -= applied;
    }
  }

  private async persistPayment(payload: any, userId: string, customer: { name: string }, session?: mongoose.ClientSession) {
    const opts = session ? { session } : undefined;
    const created = await CustomerPayment.create(
      [{ ...payload, createdBy: userId, paymentDate: payload.paymentDate || new Date() }],
      opts
    );
    const payment = Array.isArray(created) ? created[0] : created;

    await CustomerLedger.create(
      [
        {
          customer: payment.customer,
          payment: payment._id,
          type: CustomerLedgerType.CREDIT,
          amount: payment.amount,
          description: payload.note || 'Customer payment received',
          createdBy: userId
        }
      ],
      opts
    );

    await this.applyPaymentToSales(String(payment.customer), userId, Number(payment.amount), session);

    await CashboxTransaction.create(
      [
        {
          type: 'CUSTOMER_PAYMENT',
          direction: CashboxDirection.IN,
          amount: payment.amount,
          sourceModule: 'customerPayment',
          referenceId: payment._id,
          description: `Payment from ${customer.name}`,
          createdBy: userId
        }
      ],
      opts
    );

    return payment;
  }

  async create(payload: any, userId: string) {
    const customer = await Customer.findOne({ _id: payload.customer, createdBy: userId });
    if (!customer) throw new CustomError(404, 'Customer is not found!');
    const balanceRows = await CustomerLedger.aggregate([
      { $match: { customer: new Types.ObjectId(payload.customer), createdBy: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          debit: { $sum: { $cond: [{ $eq: ['$type', CustomerLedgerType.DEBIT] }, '$amount', 0] } },
          credit: { $sum: { $cond: [{ $in: ['$type', [CustomerLedgerType.CREDIT, CustomerLedgerType.ADJUSTMENT]] }, '$amount', 0] } }
        }
      }
    ]);
    const balance = (balanceRows[0]?.debit || 0) - (balanceRows[0]?.credit || 0);
    if (Number(payload.amount) > balance) throw new CustomError(400, 'Payment cannot exceed customer debt');

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const payment = await this.persistPayment(payload, userId, customer, session);
      await session.commitTransaction();
      return payment;
    } catch (error) {
      try {
        await session.abortTransaction();
      } catch {
        /* no active transaction */
      }

      if (this.isTransactionUnsupported(error)) {
        return this.persistPayment(payload, userId, customer);
      }

      throw new CustomError(400, 'Customer payment failed');
    } finally {
      session.endSession();
    }
  }

  async readAll(query: Record<string, unknown>, userId: string) {
    const match: Record<string, unknown> = { createdBy: new Types.ObjectId(userId) };
    if (query.customer) match.customer = new Types.ObjectId(String(query.customer));

    const data = await CustomerPayment.aggregate([{ $match: match }, ...sortAndPaginatePipeline(query)]);
    const totalCount = await CustomerPayment.countDocuments(match);
    return { data, totalCount };
  }
}

export default new CustomerPaymentServices();
