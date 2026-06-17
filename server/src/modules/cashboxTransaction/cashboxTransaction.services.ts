/* eslint-disable @typescript-eslint/no-explicit-any */

import { Types } from 'mongoose';

import httpStatus from 'http-status';

import CashboxTransaction from './cashboxTransaction.model';

import cashboxPersonAccountServices from '../cashboxPersonAccount/cashboxPersonAccount.services';

import { CashboxDirection } from '../../constant/ledgerTypes';

import sortAndPaginatePipeline from '../../lib/sortAndPaginate.pipeline';

import CustomError from '../../errors/customError';



class CashboxTransactionServices {

  private isPersonAccountType(type?: string, transactionType?: string) {

    return ['DEPOSIT', 'WITHDRAWAL'].includes(String(type)) || ['DEPOSIT', 'WITHDRAWAL'].includes(String(transactionType));

  }



  async create(payload: any, userId: string) {

    const transactionType = payload.transactionType || (['DEPOSIT', 'WITHDRAWAL'].includes(payload.type) ? payload.type : undefined);



    if (this.isPersonAccountType(payload.type, transactionType)) {

      await cashboxPersonAccountServices.addTransaction(

        {

          personName: payload.personName || payload.actor || payload.performedBy,

          transactionType,

          amount: payload.amount,

          reason: payload.reason,

          notes: payload.description || payload.notes,

          date: payload.date,

        },

        userId,

      );

      const accountKey = String(payload.personName || payload.actor || payload.performedBy || '')

        .trim()

        .replace(/\s+/g, ' ')

        .toLowerCase();

      const last = await CashboxTransaction.findOne({ createdBy: userId, personAccountKey: accountKey })

        .sort({ createdAt: -1 })

        .lean();

      return last;

    }



    const direction = payload.direction;

    if (!['IN', 'OUT'].includes(direction)) {

      throw new CustomError(httpStatus.BAD_REQUEST, 'Cashbox direction is required');

    }

    if (Number(payload.amount) <= 0) {

      throw new CustomError(httpStatus.BAD_REQUEST, 'Amount must be greater than zero');

    }



    return CashboxTransaction.create({

      ...payload,

      type: transactionType || payload.type,

      transactionType,

      direction,

      personName: payload.personName?.trim(),

      reason: payload.reason?.trim(),

      description: payload.description?.trim(),

      sourceModule: payload.sourceModule || payload.type || 'MANUAL',

      relatedCustomer: payload.relatedCustomer?.trim(),

      relatedCashboxReference: payload.relatedCashboxReference?.trim() || payload.referenceId,

      actor: payload.actor?.trim() || payload.performedBy?.trim(),

      performedBy: payload.performedBy?.trim() || payload.actor?.trim(),

      createdBy: userId,

    });

  }



  async readAll(query: Record<string, unknown>, userId: string) {

    const match: Record<string, unknown> = { createdBy: new Types.ObjectId(userId) };

    if (query.direction) match.direction = query.direction;

    if (query.type) match.type = query.type;



    const data = await CashboxTransaction.aggregate([{ $match: match }, ...sortAndPaginatePipeline(query)]);

    const totalCount = await CashboxTransaction.countDocuments(match);

    return { data, totalCount };

  }



  async getSummary(userId: string) {

    const rows = await CashboxTransaction.aggregate([

      { $match: { createdBy: new Types.ObjectId(userId) } },

      {

        $group: {

          _id: '$direction',

          total: { $sum: '$amount' },

        },

      },

    ]);



    const cashIn = rows.find((r) => r._id === CashboxDirection.IN)?.total || 0;

    const cashOut = rows.find((r) => r._id === CashboxDirection.OUT)?.total || 0;

    return { cashIn, cashOut, balance: cashIn - cashOut };

  }

}



export default new CashboxTransactionServices();

