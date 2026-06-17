/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import httpStatus from 'http-status';
import CustomerDebtorAccount from './customerDebtorAccount.model';
import CustomError from '../../errors/customError';

class CustomerDebtorAccountServices {
  private normalizePersonKey(name: string) {
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private formatAccount(doc: any) {
    const debtEntries = (doc.debtEntries || []).map((entry: any) => ({
      _id: entry._id,
      date: entry.date,
      amount: Number(entry.amount || 0),
      reason: entry.reason || '',
      notes: entry.notes || '',
      createdAt: entry.createdAt,
    }));

    const totalDebt = debtEntries.reduce((sum: number, entry: any) => sum + Number(entry.amount || 0), 0);
    const lastDebtDate = debtEntries.length
      ? debtEntries.reduce((latest: string, entry: any) => {
          const value = new Date(entry.date || 0).getTime();
          return value > new Date(latest || 0).getTime() ? entry.date : latest;
        }, debtEntries[0].date)
      : undefined;

    return {
      _id: doc._id,
      customerName: doc.customerName,
      accountKey: doc.accountKey,
      status: doc.status,
      accountNotes: doc.accountNotes || '',
      accountCreatedAt: doc.createdAt,
      totalDebt: doc.status === 'SETTLED' ? Number(doc.settlementTotalDebt || totalDebt) : totalDebt,
      currentDebt: doc.status === 'ACTIVE' ? totalDebt : 0,
      debtEntries,
      settledAt: doc.settledAt,
      settlementTotalDebt: doc.settlementTotalDebt,
      settlementReasonSummary: doc.settlementReasonSummary || '',
      lastDebtDate,
    };
  }

  async readAll(query: Record<string, unknown>, userId: string) {
    const search = query.search ? String(query.search).trim() : '';
    const status = String(query.status || 'active').toLowerCase();
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.max(Number(query.limit) || 10, 1);
    const skip = (page - 1) * limit;

    const match: Record<string, unknown> = {
      createdBy: new Types.ObjectId(userId),
      status: status === 'settled' ? 'SETTLED' : 'ACTIVE',
    };

    if (search) {
      match.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { settlementReasonSummary: { $regex: search, $options: 'i' } },
        { accountNotes: { $regex: search, $options: 'i' } },
      ];
    }

    const [rows, totalCount] = await Promise.all([
      CustomerDebtorAccount.find(match).sort({ updatedAt: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      CustomerDebtorAccount.countDocuments(match),
    ]);

    return {
      data: rows.map((row) => this.formatAccount(row)),
      totalCount,
    };
  }

  async read(id: string, userId: string) {
    const doc = await CustomerDebtorAccount.findOne({ _id: id, createdBy: userId }).lean();
    if (!doc) throw new CustomError(httpStatus.NOT_FOUND, 'Debtor account is not found!');
    return this.formatAccount(doc);
  }

  async addDebt(payload: any, userId: string) {
    const customerName = String(payload.customerName || '').trim().replace(/\s+/g, ' ');
    const accountKey = this.normalizePersonKey(customerName);

    if (!customerName) {
      throw new CustomError(httpStatus.BAD_REQUEST, 'Customer name is required');
    }
    if (Number(payload.amount) <= 0) {
      throw new CustomError(httpStatus.BAD_REQUEST, 'Amount must be greater than zero');
    }
    if (!String(payload.reason || '').trim()) {
      throw new CustomError(httpStatus.BAD_REQUEST, 'Debt reason is required');
    }

    const debtEntry = {
      date: payload.date ? new Date(payload.date) : new Date(),
      amount: Number(payload.amount),
      reason: String(payload.reason).trim(),
      notes: payload.notes?.trim() || '',
    };

    let account = await CustomerDebtorAccount.findOne({
      createdBy: userId,
      accountKey,
      status: 'ACTIVE',
    });

    if (account) {
      account.debtEntries.push(debtEntry as any);
      if (payload.accountNotes?.trim()) {
        account.accountNotes = payload.accountNotes.trim();
      }
      await account.save();
      return this.formatAccount(account.toObject());
    }

    account = await CustomerDebtorAccount.create({
      customerName,
      accountKey,
      status: 'ACTIVE',
      accountNotes: payload.accountNotes?.trim() || '',
      debtEntries: [debtEntry],
      createdBy: userId,
    });

    return this.formatAccount(account.toObject());
  }

  async settle(id: string, userId: string) {
    const account = await CustomerDebtorAccount.findOne({ _id: id, createdBy: userId, status: 'ACTIVE' });
    if (!account) throw new CustomError(httpStatus.NOT_FOUND, 'Active debtor account is not found!');

    const totalDebt = account.debtEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    if (totalDebt <= 0) {
      throw new CustomError(httpStatus.BAD_REQUEST, 'Account has no debt to settle');
    }

    const settlementReasonSummary = account.debtEntries
      .map((entry) => entry.reason?.trim())
      .filter(Boolean)
      .join('; ');

    account.status = 'SETTLED';
    account.settledAt = new Date();
    account.settlementTotalDebt = totalDebt;
    account.settlementReasonSummary = settlementReasonSummary;
    await account.save();

    return this.formatAccount(account.toObject());
  }
}

const customerDebtorAccountServices = new CustomerDebtorAccountServices();
export default customerDebtorAccountServices;
