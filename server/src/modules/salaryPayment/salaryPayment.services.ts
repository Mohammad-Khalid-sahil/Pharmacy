/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import SalaryPayment from './salaryPayment.model';
import Employee from '../employee/employee.model';
import CashboxTransaction from '../cashboxTransaction/cashboxTransaction.model';
import { CashboxDirection } from '../../constant/ledgerTypes';
import CustomError from '../../errors/customError';
import sortAndPaginatePipeline from '../../lib/sortAndPaginate.pipeline';
import { Types } from 'mongoose';

class SalaryPaymentServices {
  private isTransactionUnsupported(error: unknown) {
    const err = error as { code?: number; message?: string };
    return (
      err?.code === 20 ||
      Boolean(err?.message?.includes('Transaction numbers are only allowed')) ||
      Boolean(err?.message?.includes('replica set'))
    );
  }

  private async persistPayment(payload: any, userId: string, employee: { name: string }, session?: mongoose.ClientSession) {
    const opts = session ? { session } : undefined;
    const created = await SalaryPayment.create(
      [{ ...payload, createdBy: userId, paymentDate: payload.paymentDate || new Date() }],
      opts
    );
    const payment = Array.isArray(created) ? created[0] : created;

    await CashboxTransaction.create(
      [
        {
          type: 'SALARY_PAYMENT',
          direction: CashboxDirection.OUT,
          amount: payment.amount,
          sourceModule: 'salaryPayment',
          referenceId: payment._id,
          description: `Salary for ${employee.name}`,
          createdBy: userId
        }
      ],
      opts
    );

    return payment;
  }

  async create(payload: any, userId: string) {
    const employee = await Employee.findOne({ _id: payload.employee, createdBy: userId });
    if (!employee) throw new CustomError(404, 'Employee is not found!');

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const payment = await this.persistPayment(payload, userId, employee, session);
      await session.commitTransaction();
      return payment;
    } catch (error) {
      try {
        await session.abortTransaction();
      } catch {
        /* no active transaction */
      }

      if (this.isTransactionUnsupported(error)) {
        return this.persistPayment(payload, userId, employee);
      }

      throw new CustomError(400, 'Salary payment failed');
    } finally {
      session.endSession();
    }
  }

  async readAll(query: Record<string, unknown>, userId: string) {
    const match: Record<string, unknown> = { createdBy: new Types.ObjectId(userId) };
    if (query.employee) match.employee = new Types.ObjectId(String(query.employee));

    const data = await SalaryPayment.aggregate([{ $match: match }, ...sortAndPaginatePipeline(query)]);
    const totalCount = await SalaryPayment.countDocuments(match);
    return { data, totalCount };
  }
}

export default new SalaryPaymentServices();
