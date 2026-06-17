/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import httpStatus from 'http-status';
import Customer from './customer.model';
import CustomerLedger from '../customerLedger/customerLedger.model';
import CustomError from '../../errors/customError';
import sortAndPaginatePipeline from '../../lib/sortAndPaginate.pipeline';
import { CustomerLedgerType } from '../../constant/ledgerTypes';

class CustomerServices {
  private model = Customer;

  async create(payload: any, userId: string) {
    return this.model.create({ ...payload, createdBy: userId });
  }

  async readAll(query: Record<string, unknown>, userId: string) {
    const search = query.search ? String(query.search) : '';
    const match = {
      createdBy: new Types.ObjectId(userId),
      $or: [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }]
    };

    const data = await this.model.aggregate([{ $match: match }, ...sortAndPaginatePipeline(query)]);
    const totalCount = await this.model.countDocuments({ createdBy: userId });
    return { data, totalCount };
  }

  async read(id: string, userId: string) {
    const doc = await this.model.findOne({ _id: id, createdBy: userId });
    if (!doc) throw new CustomError(httpStatus.NOT_FOUND, 'Customer is not found!');
    return doc;
  }

  async update(id: string, payload: any, userId: string) {
    const doc = await this.model.findOneAndUpdate({ _id: id, createdBy: userId }, payload, { new: true });
    if (!doc) throw new CustomError(httpStatus.NOT_FOUND, 'Customer is not found!');
    return doc;
  }

  async delete(id: string, userId: string) {
    const doc = await this.model.findOneAndDelete({ _id: id, createdBy: userId });
    if (!doc) throw new CustomError(httpStatus.NOT_FOUND, 'Customer is not found!');
    return doc;
  }

  async getBalance(customerId: string, userId: string) {
    await this.read(customerId, userId);
    const rows = await CustomerLedger.aggregate([
      { $match: { customer: new Types.ObjectId(customerId), createdBy: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          debit: {
            $sum: {
              $cond: [{ $eq: ['$type', CustomerLedgerType.DEBIT] }, '$amount', 0]
            }
          },
          credit: {
            $sum: {
              $cond: [{ $in: ['$type', [CustomerLedgerType.CREDIT, CustomerLedgerType.ADJUSTMENT]] }, '$amount', 0]
            }
          }
        }
      }
    ]);

    const debit = rows[0]?.debit || 0;
    const credit = rows[0]?.credit || 0;
    return { debit, credit, balance: debit - credit };
  }
}

const customerServices = new CustomerServices();
export default customerServices;
