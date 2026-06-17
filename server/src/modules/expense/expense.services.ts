import mongoose, { Types } from 'mongoose';
import BaseServices from '../baseServices';
import Expense from './expense.model';
import sortAndPaginatePipeline from '../../lib/sortAndPaginate.pipeline';
import CashboxTransaction from '../cashboxTransaction/cashboxTransaction.model';
import { CashboxDirection } from '../../constant/ledgerTypes';
import CustomError from '../../errors/customError';

class ExpenseServices extends BaseServices<any> {
  constructor(model: any, modelName: string) {
    super(model, modelName);
  }

  async create(payload: any, userId: string) {
    return this.createWithCashbox(payload, userId);
  }

  private isTransactionUnsupported(error: unknown) {
    const err = error as { code?: number; message?: string };
    return (
      err?.code === 20 ||
      Boolean(err?.message?.includes('Transaction numbers are only allowed')) ||
      Boolean(err?.message?.includes('replica set'))
    );
  }

  private async persistCreate(payload: any, userId: string, session?: mongoose.ClientSession) {
    const amount = Number(payload.amount);
    if (amount <= 0) throw new CustomError(400, 'Expense amount must be greater than zero');
    const normalizedPayload = { ...payload, date: this.normalizeExpenseDate(payload.date) };
    const opts = session ? { session } : undefined;
    const created = session
      ? await this.model.create([{ ...normalizedPayload, user: userId }], opts)
      : await this.model.create({ ...normalizedPayload, user: userId });
    const expense = Array.isArray(created) ? created[0] : created;

    await CashboxTransaction.create(
      [
        {
          type: 'EXPENSE',
          direction: CashboxDirection.OUT,
          amount: expense.amount,
          sourceModule: 'expense',
          referenceId: expense._id,
          description: expense.title,
          createdBy: userId
        }
      ],
      opts
    );

    return expense;
  }

  private async createWithCashbox(payload: any, userId: string) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const expense = await this.persistCreate(payload, userId, session);
      await session.commitTransaction();
      return expense;
    } catch (error) {
      try {
        await session.abortTransaction();
      } catch {
        /* no active transaction */
      }

      if (this.isTransactionUnsupported(error)) {
        return this.persistCreate(payload, userId);
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }

  async updateExpense(id: string, payload: any, userId: string) {
    const expense = await this.model.findOne({ _id: id, user: new Types.ObjectId(userId) });
    if (!expense) throw new CustomError(404, 'Expense is not found!');

    const amount = Number(payload.amount ?? expense.amount);
    if (amount <= 0) throw new CustomError(400, 'Expense amount must be greater than zero');
    const normalizedPayload = { ...payload };
    if (payload.date) normalizedPayload.date = this.normalizeExpenseDate(payload.date);

    const updated = await this.model.findOneAndUpdate({ _id: id, user: new Types.ObjectId(userId) }, normalizedPayload, { new: true, runValidators: true });
    await CashboxTransaction.findOneAndUpdate(
      { sourceModule: 'expense', referenceId: expense._id, createdBy: new Types.ObjectId(userId) },
      {
        type: 'EXPENSE',
        direction: CashboxDirection.OUT,
        amount,
        description: updated.title
      },
      { upsert: true }
    );
    return updated;
  }

  async deleteExpense(id: string, userId: string) {
    const expense = await this.model.findOneAndDelete({ _id: id, user: new Types.ObjectId(userId) });
    if (!expense) throw new CustomError(404, 'Expense is not found!');
    await CashboxTransaction.deleteMany({ sourceModule: 'expense', referenceId: expense._id, createdBy: new Types.ObjectId(userId) });
    return expense;
  }

  private normalizeExpenseDate(value: unknown) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day, 12));
    }
    return value;
  }

  private calendarKey(date: Date, timeZone = 'UTC') {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(date);
      const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
      return `${get('year')}-${get('month')}-${get('day')}`;
    } catch {
      return date.toISOString().slice(0, 10);
    }
  }

  private addDays(dateKey: string, days: number) {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  private dateBoundaries(timeZone?: string) {
    const todayKey = this.calendarKey(new Date(), timeZone || 'UTC');
    const [year, month, day] = todayKey.split('-').map(Number);
    const todayNoon = new Date(Date.UTC(year, month - 1, day, 12));
    const weekStartKey = this.addDays(todayKey, -((todayNoon.getUTCDay() + 6) % 7));
    const nextWeekStartKey = this.addDays(weekStartKey, 7);
    const nextDayKey = this.addDays(todayKey, 1);
    const monthStartKey = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextMonthStartKey = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const yearStartKey = `${year}-01-01`;
    const nextYearStartKey = `${year + 1}-01-01`;

    return { todayKey, nextDayKey, weekStartKey, nextWeekStartKey, monthStartKey, nextMonthStartKey, yearStartKey, nextYearStartKey };
  }

  private async getSummary(userId: string, timeZone?: string) {
    const boundaries = this.dateBoundaries(timeZone);
    const summaryTimeZone = timeZone || 'UTC';
    const [summary] = await this.model.aggregate([
      { $match: { user: new Types.ObjectId(userId) } },
      {
        $project: {
          amount: 1,
          expenseDateKey: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$date',
              timezone: summaryTimeZone
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          todayExpense: {
            $sum: {
              $cond: [{ $and: [{ $gte: ['$expenseDateKey', boundaries.todayKey] }, { $lt: ['$expenseDateKey', boundaries.nextDayKey] }] }, '$amount', 0]
            }
          },
          weeklyExpense: {
            $sum: {
              $cond: [{ $and: [{ $gte: ['$expenseDateKey', boundaries.weekStartKey] }, { $lt: ['$expenseDateKey', boundaries.nextWeekStartKey] }] }, '$amount', 0]
            }
          },
          monthlyExpense: {
            $sum: {
              $cond: [{ $and: [{ $gte: ['$expenseDateKey', boundaries.monthStartKey] }, { $lt: ['$expenseDateKey', boundaries.nextMonthStartKey] }] }, '$amount', 0]
            }
          },
          yearlyExpense: {
            $sum: {
              $cond: [{ $and: [{ $gte: ['$expenseDateKey', boundaries.yearStartKey] }, { $lt: ['$expenseDateKey', boundaries.nextYearStartKey] }] }, '$amount', 0]
            }
          },
          totalExpense: { $sum: '$amount' }
        }
      },
      { $project: { _id: 0, todayExpense: 1, weeklyExpense: 1, monthlyExpense: 1, yearlyExpense: 1, totalExpense: 1 } }
    ]);

    return summary || { todayExpense: 0, weeklyExpense: 0, monthlyExpense: 0, yearlyExpense: 0, totalExpense: 0 };
  }

  async getAll(userId: string, query: Record<string, unknown>) {
    const search = query.search ? String(query.search) : '';
    const match = {
      user: new Types.ObjectId(userId),
      $or: [{ title: { $regex: search, $options: 'i' } }, { note: { $regex: search, $options: 'i' } }]
    };

    const data = await this.model.aggregate([{ $match: match }, ...sortAndPaginatePipeline(query)]);
    const totalCount = await this.model.countDocuments(match);
    const summary = await this.getSummary(userId, query.timeZone ? String(query.timeZone) : undefined);

    return { data, totalCount, summary };
  }
}

const expenseServices = new ExpenseServices(Expense, 'Expense');
export default expenseServices;
