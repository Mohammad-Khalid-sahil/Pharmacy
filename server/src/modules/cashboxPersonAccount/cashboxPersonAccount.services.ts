/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import httpStatus from 'http-status';
import CashboxPersonAccount from './cashboxPersonAccount.model';
import CashboxTransaction from '../cashboxTransaction/cashboxTransaction.model';
import { CashboxDirection } from '../../constant/ledgerTypes';
import CustomError from '../../errors/customError';

const PERSON_ACCOUNT_SOURCE = 'OPERATOR_ACCOUNT';

class CashboxPersonAccountServices {
  private normalizePersonKey(name: string) {
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private formatAccount(doc: any) {
    const personName = doc.personName || '';
    const transactions = [...(doc.transactions || [])]
      .map((entry: any) => ({
        _id: entry._id,
        personName: entry.personName || personName,
        date: entry.date,
        amount: Number(entry.amount || 0),
        transactionType: entry.transactionType,
        reason: entry.reason || '',
        notes: entry.notes || '',
        createdAt: entry.createdAt,
      }))
      .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());

    const totalDeposited = transactions
      .filter((entry) => entry.transactionType === 'DEPOSIT')
      .reduce((sum, entry) => sum + entry.amount, 0);
    const totalWithdrawn = transactions
      .filter((entry) => entry.transactionType === 'WITHDRAWAL')
      .reduce((sum, entry) => sum + entry.amount, 0);

    let runningBalance = 0;
    const withBalance = transactions.map((entry) => {
      runningBalance += entry.transactionType === 'DEPOSIT' ? entry.amount : -entry.amount;
      return { ...entry, resultingBalance: runningBalance };
    });

    return {
      _id: doc._id,
      personName: doc.personName,
      personAccountKey: doc.accountKey,
      accountCreatedAt: doc.createdAt,
      totalDeposited,
      totalWithdrawn,
      currentNetBalance: totalDeposited - totalWithdrawn,
      transactions: withBalance.reverse(),
    };
  }

  async readAll(query: Record<string, unknown>, userId: string) {
    const search = query.search ? String(query.search).trim() : '';
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.max(Number(query.limit) || 50, 1);
    const skip = (page - 1) * limit;

    const match: Record<string, unknown> = { createdBy: new Types.ObjectId(userId) };
    if (search) {
      match.$or = [
        { personName: { $regex: search, $options: 'i' } },
        { accountKey: { $regex: search, $options: 'i' } },
      ];
    }

    const [rows, totalCount] = await Promise.all([
      CashboxPersonAccount.find(match).sort({ personName: 1, createdAt: 1 }).skip(skip).limit(limit).lean(),
      CashboxPersonAccount.countDocuments(match),
    ]);

    return {
      data: rows.map((row) => this.formatAccount(row)),
      totalCount,
    };
  }

  async read(id: string, userId: string) {
    const doc = await CashboxPersonAccount.findOne({ _id: id, createdBy: userId }).lean();
    if (!doc) throw new CustomError(httpStatus.NOT_FOUND, 'Person account is not found!');
    return this.formatAccount(doc);
  }

  async findByKey(userId: string, accountKey: string) {
    const doc = await CashboxPersonAccount.findOne({ createdBy: userId, accountKey }).lean();
    return doc ? this.formatAccount(doc) : null;
  }

  async addTransaction(payload: any, userId: string) {
    const rawName = String(payload.personName || '').trim().replace(/\s+/g, ' ');
    const accountKey = this.normalizePersonKey(rawName);
    const transactionType = String(payload.transactionType || '').trim().toUpperCase() as 'DEPOSIT' | 'WITHDRAWAL';
    const amount = Number(payload.amount);

    if (!rawName) {
      throw new CustomError(httpStatus.BAD_REQUEST, 'Person name is required');
    }
    if (!['DEPOSIT', 'WITHDRAWAL'].includes(transactionType)) {
      throw new CustomError(httpStatus.BAD_REQUEST, 'Transaction type is required');
    }
    if (amount <= 0) {
      throw new CustomError(httpStatus.BAD_REQUEST, 'Amount must be greater than zero');
    }

    let account = await CashboxPersonAccount.findOne({ createdBy: userId, accountKey });
    const canonicalName = account?.personName?.trim() || rawName;

    if (transactionType === 'WITHDRAWAL' && account) {
      const existing = this.formatAccount(account.toObject());
      const balance = existing?.currentNetBalance || 0;
      if (amount > balance) {
        throw new CustomError(httpStatus.BAD_REQUEST, 'Withdrawal cannot exceed person account balance');
      }
    }

    const transactionEntry = {
      date: payload.date ? new Date(payload.date) : new Date(),
      personName: canonicalName,
      amount,
      transactionType,
      reason: payload.reason?.trim() || '',
      notes: payload.notes?.trim() || payload.description?.trim() || '',
    };

    if (account) {
      account.transactions.push(transactionEntry as any);
      await account.save();
    } else {
      account = await CashboxPersonAccount.create({
        personName: canonicalName,
        accountKey,
        transactions: [transactionEntry],
        createdBy: userId,
      });
    }

    const formatted = this.formatAccount(account.toObject());
    const latestTransaction = formatted.transactions[0];

    await CashboxTransaction.create({
      type: transactionType,
      transactionType,
      direction: transactionType === 'DEPOSIT' ? CashboxDirection.IN : CashboxDirection.OUT,
      amount,
      personName: canonicalName,
      personAccountKey: accountKey,
      reason: transactionEntry.reason,
      description: transactionEntry.notes,
      sourceModule: PERSON_ACCOUNT_SOURCE,
      referenceId: account._id,
      actor: canonicalName,
      performedBy: canonicalName,
      createdBy: userId,
    });

    return { account: formatted, transactionId: latestTransaction?._id };
  }
}

const cashboxPersonAccountServices = new CashboxPersonAccountServices();
export default cashboxPersonAccountServices;
