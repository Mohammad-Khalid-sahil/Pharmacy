import fs from 'fs';
import path from 'path';
import httpStatus from 'http-status';
import mongoose, { Model, Types } from 'mongoose';
import BackupLog from './backupLog.model';
import CustomError from '../../errors/customError';
import Product from '../product/product.model';
import Sale from '../sale/sale.model';
import Purchase from '../purchase/purchase.model';
import Expense from '../expense/expense.model';
import Customer from '../customer/customer.model';
import Seller from '../seller/seller.model';
import CustomerPayment from '../customerPayment/customerPayment.model';
import CustomerLedger from '../customerLedger/customerLedger.model';
import SellerPayment from '../sellerPayment/sellerPayment.model';
import SellerLedger from '../sellerLedger/sellerLedger.model';
import CashboxTransaction from '../cashboxTransaction/cashboxTransaction.model';
import MoneyTransfer from '../moneyTransfer/moneyTransfer.model';
import SaleReturn from '../saleReturn/saleReturn.model';
import Prescription from '../prescription/prescription.model';
import Employee from '../employee/employee.model';
import SalaryPayment from '../salaryPayment/salaryPayment.model';

const BACKUP_DIR = path.join(process.cwd(), 'backups');

type BackupCollectionSpec = {
  key: string;
  model: Model<any>;
  ownerField: 'user' | 'createdBy';
};

const BACKUP_COLLECTIONS: BackupCollectionSpec[] = [
  { key: 'sellers', model: Seller, ownerField: 'user' },
  { key: 'products', model: Product, ownerField: 'user' },
  { key: 'purchases', model: Purchase, ownerField: 'user' },
  { key: 'sales', model: Sale, ownerField: 'user' },
  { key: 'expenses', model: Expense, ownerField: 'user' },
  { key: 'customers', model: Customer, ownerField: 'createdBy' },
  { key: 'customerPayments', model: CustomerPayment, ownerField: 'createdBy' },
  { key: 'customerLedgers', model: CustomerLedger, ownerField: 'createdBy' },
  { key: 'sellerPayments', model: SellerPayment, ownerField: 'createdBy' },
  { key: 'sellerLedgers', model: SellerLedger, ownerField: 'createdBy' },
  { key: 'cashboxTransactions', model: CashboxTransaction, ownerField: 'createdBy' },
  { key: 'moneyTransfers', model: MoneyTransfer, ownerField: 'createdBy' },
  { key: 'saleReturns', model: SaleReturn, ownerField: 'createdBy' },
  { key: 'prescriptions', model: Prescription, ownerField: 'createdBy' },
  { key: 'employees', model: Employee, ownerField: 'createdBy' },
  { key: 'salaryPayments', model: SalaryPayment, ownerField: 'createdBy' }
];

class BackupLogServices {
  async createBackup(userId: string) {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const ownerId = new Types.ObjectId(userId);
    const collections: Record<string, unknown[]> = {};
    for (const spec of BACKUP_COLLECTIONS) {
      collections[spec.key] = await spec.model.find({ [spec.ownerField]: ownerId }).lean();
    }

    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      userId,
      collections
    };

    const fileName = `backup-${userId}-${Date.now()}.json`;
    const filePath = path.join(BACKUP_DIR, fileName);
    const content = JSON.stringify(payload, null, 2);
    fs.writeFileSync(filePath, content, 'utf-8');

    const log = await BackupLog.create({
      fileName,
      filePath,
      size: Buffer.byteLength(content, 'utf-8'),
      createdBy: userId
    });

    return log;
  }

  async readAll(userId: string) {
    return BackupLog.find({ createdBy: userId }).sort({ createdAt: -1 });
  }

  async getDownload(id: string, userId: string) {
    const log = await BackupLog.findOne({ _id: id, createdBy: userId });
    if (!log) throw new CustomError(httpStatus.NOT_FOUND, 'Backup is not found!');
    if (!fs.existsSync(log.filePath)) throw new CustomError(httpStatus.NOT_FOUND, 'Backup file is not found!');
    return log;
  }

  async delete(id: string, userId: string) {
    const log = await BackupLog.findOneAndDelete({ _id: id, createdBy: userId });
    if (!log) throw new CustomError(httpStatus.NOT_FOUND, 'Backup is not found!');
    if (fs.existsSync(log.filePath)) {
      fs.unlinkSync(log.filePath);
    }
    return log;
  }

  private isTransactionUnsupported(error: unknown) {
    const err = error as { code?: number; message?: string };
    return (
      err?.code === 20 ||
      Boolean(err?.message?.includes('Transaction numbers are only allowed')) ||
      Boolean(err?.message?.includes('replica set'))
    );
  }

  async restore(id: string, userId: string) {
    const log = await this.getDownload(id, userId);
    const raw = fs.readFileSync(log.filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    const collections = parsed.collections;
    if (!collections || typeof collections !== 'object') {
      throw new CustomError(httpStatus.BAD_REQUEST, 'Unsupported backup format');
    }

    const ownerId = new Types.ObjectId(userId);
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      for (const spec of BACKUP_COLLECTIONS) {
        const rows = Array.isArray(collections[spec.key]) ? collections[spec.key] : [];
        const sanitizedRows = rows.map((row: Record<string, unknown>) => ({
          ...row,
          [spec.ownerField]: ownerId
        }));

        await spec.model.deleteMany({ [spec.ownerField]: ownerId }, { session });
        if (sanitizedRows.length > 0) {
          await spec.model.insertMany(sanitizedRows, { session, ordered: true });
        }
      }

      await session.commitTransaction();
      return { restoredCollections: BACKUP_COLLECTIONS.length };
    } catch (error) {
      try {
        await session.abortTransaction();
      } catch {
        /* no active transaction */
      }

      if (this.isTransactionUnsupported(error)) {
        throw new CustomError(httpStatus.BAD_REQUEST, 'Restore requires MongoDB transaction support to avoid partial data');
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }
}

export default new BackupLogServices();
