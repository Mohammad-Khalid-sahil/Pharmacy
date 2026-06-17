/* eslint-disable no-unsafe-finally */
/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Types } from 'mongoose';
import sortAndPaginatePipeline from '../../lib/sortAndPaginate.pipeline';
import BaseServices from '../baseServices';
import Sale from './sale.model';
import Product from '../product/product.model';
import CustomerLedger from '../customerLedger/customerLedger.model';
import CashboxTransaction from '../cashboxTransaction/cashboxTransaction.model';
import { CustomerLedgerType, CashboxDirection } from '../../constant/ledgerTypes';
import CustomError from '../../errors/customError';
import logActivity from '../../lib/logActivity';

class SaleServices extends BaseServices<any> {
  constructor(model: any, modelName: string) {
    super(model, modelName);
  }

  private isTransactionUnsupported(error: unknown) {
    const err = error as { code?: number; message?: string };
    return (
      err?.code === 20 ||
      Boolean(err?.message?.includes('Transaction numbers are only allowed')) ||
      Boolean(err?.message?.includes('replica set'))
    );
  }

  private async persistSale(
    payload: any,
    userId: string,
    product: { _id: Types.ObjectId },
    quantity: number,
    session?: mongoose.ClientSession
  ) {
    const opts = session ? { session } : undefined;

    await Product.findByIdAndUpdate(product._id, { $inc: { stock: -quantity } }, opts);
    const created = session
      ? await this.model.create([payload], { session })
      : await this.model.create(payload);
    const sale = Array.isArray(created) ? created[0] : created;
    const paidAmount = Number(payload.paidAmount);
    const dueAmount = Math.max(sale.totalPrice - paidAmount, 0);

    if (paidAmount > 0) {
      await CashboxTransaction.create(
        [
          {
            type: 'SALE',
            direction: CashboxDirection.IN,
            amount: paidAmount,
            sourceModule: 'sale',
            referenceId: sale._id,
            description: `Sale: ${sale.productName}`,
            createdBy: userId
          }
        ],
        opts
      );
    }

    if (payload.customer && dueAmount > 0) {
      await CustomerLedger.create(
        [
          {
            customer: payload.customer,
            sale: sale._id,
            type: CustomerLedgerType.DEBIT,
            amount: dueAmount,
            description: `Credit sale: ${sale.productName}`,
            createdBy: userId
          }
        ],
        opts
      );
    }

    return sale;
  }

  /**
   * Create new sale and decrease product stock
   */
  async create(payload: any, userId: string) {
    const { quantity } = payload;
    payload.user = userId;
    const product = await Product.findOne({ _id: payload.product, user: new Types.ObjectId(userId) });
    if (!product) {
      throw new CustomError(404, 'Product is not found!');
    }
    payload.productPrice = Number(payload.productPrice || product?.salePrice || product?.price || 0);
    payload.purchasePrice = Number(product?.purchasePrice || 0);
    payload.totalPrice = payload.productPrice * quantity;
    payload.profit = (payload.productPrice - payload.purchasePrice) * quantity;

    const paymentType = payload.paymentType || 'CASH';
    const totalPrice = payload.totalPrice;
    let paidAmount = Number(payload.paidAmount ?? totalPrice);

    if (paymentType === 'CASH') {
      paidAmount = totalPrice;
    } else if (paymentType === 'CREDIT') {
      if (!payload.customer) throw new CustomError(400, 'Customer is required for credit sale');
      paidAmount = 0;
    } else if (paymentType === 'PARTIAL') {
      if (!payload.customer) throw new CustomError(400, 'Customer is required for partial payment');
      if (paidAmount <= 0 || paidAmount >= totalPrice) {
        throw new CustomError(400, 'Partial paid amount must be greater than 0 and less than total');
      }
    }

    payload.paidAmount = paidAmount;
    payload.dueAmount = Math.max(totalPrice - paidAmount, 0);
    payload.paymentType = paymentType;

    if (quantity > product!.stock) {
      throw new CustomError(400, `${quantity} product are not available in stock!`);
    }

    const session = await mongoose.startSession();

    try {
      session.startTransaction();
      const sale = await this.persistSale(payload, userId, product!, quantity, session);
      await session.commitTransaction();
      await logActivity({
        userId,
        action: 'STOCK_OUT',
        module: 'stock',
        recordId: String(product!._id),
        newData: { quantity: -quantity, sale: sale._id, productName: sale.productName },
        description: `Sale stock out: ${sale.productName}`
      });
      return [sale];
    } catch (error) {
      try {
        await session.abortTransaction();
      } catch {
        /* no active transaction */
      }

      if (this.isTransactionUnsupported(error)) {
        const sale = await this.persistSale(payload, userId, product!, quantity);
        await logActivity({
          userId,
          action: 'STOCK_OUT',
          module: 'stock',
          recordId: String(product!._id),
          newData: { quantity: -quantity, sale: sale._id, productName: sale.productName },
          description: `Sale stock out: ${sale.productName}`
        });
        return [sale];
      }

      const message = error instanceof Error ? error.message : 'Sale create failed';
      throw new CustomError(400, message);
    } finally {
      await session.endSession();
    }
  }

  /**
   * Create multiple sales in one transaction (POS)
   * payload: { items: [{ product, quantity, productPrice? }], buyerName, date, paymentType, paidAmount, customer }
   */
  async createBulk(payload: any, userId: string) {
    const { items } = payload;
    if (!Array.isArray(items) || items.length === 0) {
      throw new CustomError(400, 'Items are required');
    }

    const productsMap: Record<string, any> = {};
    for (const it of items) {
      const productDoc = await Product.findOne({ _id: it.product, user: new Types.ObjectId(userId) });
      if (!productDoc) throw new CustomError(404, `Product ${it.product} is not found!`);
      productsMap[String(it.product)] = productDoc;
      const qty = Number(it.quantity || 0);
      if (qty <= 0) throw new CustomError(400, 'Quantity must be at least 1');
      if (qty > productDoc.stock) throw new CustomError(400, `${qty} product are not available in stock!`);
    }

    const salePayloads: any[] = [];
    let aggregateTotal = 0;
    for (const it of items) {
      const productDoc = productsMap[String(it.product)];
      const productPrice = Number(it.productPrice ?? productDoc.salePrice ?? productDoc.price ?? 0);
      const purchasePrice = Number(productDoc.purchasePrice || 0);
      const qty = Number(it.quantity);
      const totalPrice = productPrice * qty;
      const profit = (productPrice - purchasePrice) * qty;

      aggregateTotal += totalPrice;

      salePayloads.push({
        product: productDoc._id,
        productName: productDoc.name,
        productPrice,
        purchasePrice,
        quantity: qty,
        totalPrice,
        profit,
        buyerName: payload.buyerName,
        date: payload.date,
        paymentType: payload.paymentType,
        user: userId,
      });
    }

    const paymentType = payload.paymentType || 'CASH';
    const totalPriceAll = aggregateTotal;
    let paidAmount = Number(payload.paidAmount ?? totalPriceAll);

    if (paymentType === 'CASH') {
      paidAmount = totalPriceAll;
    } else if (paymentType === 'CREDIT') {
      if (!payload.customer) throw new CustomError(400, 'Customer is required for credit sale');
      paidAmount = 0;
    } else if (paymentType === 'PARTIAL') {
      if (!payload.customer) throw new CustomError(400, 'Customer is required for partial payment');
      if (paidAmount <= 0 || paidAmount >= totalPriceAll) {
        throw new CustomError(400, 'Partial paid amount must be greater than 0 and less than total');
      }
    }

    const dueAmountAll = Math.max(totalPriceAll - paidAmount, 0);
    const transactionId = new Types.ObjectId();

    const buildBulkPayloads = () => {
      let remainingPaid = paidAmount;
      return salePayloads.map((p, index) => {
        const isLast = index === salePayloads.length - 1;
        const itemPaid = paymentType === 'CASH'
          ? p.totalPrice
          : paymentType === 'CREDIT'
          ? 0
          : isLast
          ? remainingPaid
          : Number(((p.totalPrice / totalPriceAll) * paidAmount).toFixed(2));
        if (!isLast && paymentType === 'PARTIAL') {
          remainingPaid -= itemPaid;
        }
        const itemDue = Math.max(p.totalPrice - itemPaid, 0);
        return {
          ...p,
          transactionId,
          paymentType,
          paidAmount: itemPaid,
          dueAmount: itemDue,
          customer: payload.customer || undefined,
        };
      });
    };

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      for (const it of items) {
        await Product.findByIdAndUpdate(it.product, { $inc: { stock: -Number(it.quantity) } }, { session });
      }

      const bulkPayloads = buildBulkPayloads();
      const created = await this.model.create(bulkPayloads, { session });

      if (paidAmount > 0) {
        await CashboxTransaction.create([
          {
            type: 'SALE',
            direction: CashboxDirection.IN,
            amount: paidAmount,
            sourceModule: 'sale',
            referenceId: created[0]._id,
            description: `Sale: POS transaction`,
            createdBy: userId,
          },
        ], { session });
      }

      if (payload.customer && dueAmountAll > 0) {
        await CustomerLedger.create([
          {
            customer: payload.customer,
            sale: created[0]._id,
            type: CustomerLedgerType.DEBIT,
            amount: dueAmountAll,
            description: `Credit sale: POS transaction`,
            createdBy: userId,
          },
        ], { session });
      }

      await session.commitTransaction();

      for (const it of items) {
        await logActivity({
          userId,
          action: 'STOCK_OUT',
          module: 'stock',
          recordId: String(it.product),
          newData: { quantity: -it.quantity, sale: created[0]._id, productName: productsMap[String(it.product)].name },
          description: `Sale stock out: ${productsMap[String(it.product)].name}`,
        });
      }

      return Array.isArray(created) ? created : [created];
    } catch (error) {
      try {
        await session.abortTransaction();
      } catch {}

      if (this.isTransactionUnsupported(error)) {
        const bulkPayloads = buildBulkPayloads();
        const decrementedItems: any[] = [];
        const createdSales: any[] = [];
        let cashboxTransaction: any = null;
        let customerLedger: any = null;

        try {
          for (const it of items) {
            await Product.findByIdAndUpdate(it.product, { $inc: { stock: -Number(it.quantity) } });
            decrementedItems.push(it);
          }

          for (const salePayload of bulkPayloads) {
            const sale = await this.model.create(salePayload);
            createdSales.push(sale);
          }

          if (paidAmount > 0) {
            cashboxTransaction = await CashboxTransaction.create({
              type: 'SALE',
              direction: CashboxDirection.IN,
              amount: paidAmount,
              sourceModule: 'sale',
              referenceId: createdSales[0]._id,
              description: `Sale: POS transaction`,
              createdBy: userId,
            });
          }

          if (payload.customer && dueAmountAll > 0) {
            customerLedger = await CustomerLedger.create({
              customer: payload.customer,
              sale: createdSales[0]._id,
              type: CustomerLedgerType.DEBIT,
              amount: dueAmountAll,
              description: `Credit sale: POS transaction`,
              createdBy: userId,
            });
          }

          for (const it of items) {
            await logActivity({
              userId,
              action: 'STOCK_OUT',
              module: 'stock',
              recordId: String(it.product),
              newData: { quantity: -it.quantity, sale: createdSales[0]._id, productName: productsMap[String(it.product)].name },
              description: `Sale stock out: ${productsMap[String(it.product)].name}`,
            });
          }

          return createdSales;
        } catch (fallbackError) {
          await Promise.all(
            decrementedItems.map((it) =>
              Product.findByIdAndUpdate(it.product, { $inc: { stock: Number(it.quantity) } })
            )
          );
          await this.model.deleteMany({ _id: { $in: createdSales.map((sale) => sale._id) } });
          if (cashboxTransaction?._id) await CashboxTransaction.findByIdAndDelete(cashboxTransaction._id);
          if (customerLedger?._id) await CustomerLedger.findByIdAndDelete(customerLedger._id);
          const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : 'Bulk sale create failed';
          throw new CustomError(400, fallbackMessage);
        }
      }

      const message = error instanceof Error ? error.message : 'Bulk sale create failed';
      throw new CustomError(400, message);
    } finally {
      await session.endSession();
    }
  }

  async readByTransaction(transactionId: string, userId: string) {
    return this.model.find({ user: new Types.ObjectId(userId), transactionId }).sort({ createdAt: 1 });
  }

  /**
   *  Get all sale
   */
  async readAll(query: Record<string, unknown> = {}, userId: string) {
    // const date = query.date ? query.date : null;
    const search = query.search ? (query.search as string) : '';

    const data = await this.model.aggregate([
      {
        $match: {
          user: new Types.ObjectId(userId),
          $or: [{ productName: { $regex: search, $options: 'i' } }, { buyerName: { $regex: search, $options: 'i' } }]
        }
      },
      ...sortAndPaginatePipeline(query)
    ]);

    const totalCount = await this.model.aggregate([
      {
        $match: {
          user: new Types.ObjectId(userId)
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0
        }
      }
    ]);

    return { data, totalCount };
  }

  async readAllWeeks(userId: string) {
    return await this.model.aggregate([
      {
        $match: {
          user: new Types.ObjectId(userId),
          date: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            week: { $isoWeek: '$date' },
            year: { $isoWeekYear: '$date' }
          },
          totalQuantity: { $sum: '$quantity' },
          totalRevenue: { $sum: '$totalPrice' },
          totalProfit: { $sum: '$profit' }
        }
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.week': 1
        }
      },
      {
        $project: {
          week: '$_id.week',
          year: '$_id.year',
          totalQuantity: 1,
          totalRevenue: 1,
          totalProfit: 1,
          _id: 0
        }
      }
    ]);
  }

  async readAllYearly(userId: string) {
    return await this.model.aggregate([
      {
        $match: {
          user: new Types.ObjectId(userId),
          date: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' }
          },
          totalQuantity: { $sum: '$quantity' },
          totalRevenue: { $sum: '$totalPrice' },
          totalProfit: { $sum: '$profit' }
        }
      },
      {
        $sort: {
          '_id.year': 1
        }
      },
      {
        $project: {
          year: '$_id.year',
          totalQuantity: 1,
          totalRevenue: 1,
          totalProfit: 1,
          _id: 0
        }
      }
    ]);
  }

  async readAllDaily(userId: string) {
    return await this.model.aggregate([
      {
        $match: {
          user: new Types.ObjectId(userId),
          date: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            day: { $dayOfMonth: '$date' },
            month: { $month: '$date' },
            year: { $year: '$date' }
          },
          totalQuantity: { $sum: '$quantity' },
          totalRevenue: { $sum: '$totalPrice' },
          totalProfit: { $sum: '$profit' }
        }
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
          '_id.day': 1
        }
      },
      {
        $project: {
          day: '$_id.day',
          month: '$_id.month',
          year: '$_id.year',
          totalQuantity: 1,
          totalRevenue: 1,
          totalProfit: 1,
          _id: 0
        }
      }
    ]);
  }

  async readAllMonths(userId: string) {
    return await this.model.aggregate([
      {
        $match: {
          user: new Types.ObjectId(userId),
          date: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$date' },
            year: { $year: '$date' }
          },
          totalQuantity: { $sum: '$quantity' },
          totalRevenue: { $sum: '$totalPrice' },
          totalProfit: { $sum: '$profit' }
        }
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1
        }
      },
      {
        $project: {
          month: '$_id.month',
          year: '$_id.year',
          totalQuantity: 1,
          totalRevenue: 1,
          totalProfit: 1,
          _id: 0
        }
      }
    ]);
  }

  // get single sale
  async read(id: string, userId: string) {
    await this._isExists(id);

    return this.model.findOne({ user: new Types.ObjectId(userId), _id: id }).populate({
      path: 'product',
      select: '-createdAt -updatedAt -__v'
    });
  }

  async updateSale(id: string, payload: Record<string, unknown>, userId: string) {
    const sale = await this.model.findOne({ _id: id, user: new Types.ObjectId(userId) });
    if (!sale) {
      throw new CustomError(404, 'Sale is not found!');
    }

    const product = await Product.findById(sale.product);
    if (!product) {
      throw new CustomError(404, 'Product is not found!');
    }

    const newQuantity = Number(payload.quantity ?? sale.quantity);
    const newPrice = Number(payload.productPrice ?? payload.price ?? sale.productPrice);
    const quantityDelta = newQuantity - sale.quantity;

    if (quantityDelta > 0 && product.stock < quantityDelta) {
      throw new CustomError(400, `${quantityDelta} product are not available in stock!`);
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      if (quantityDelta !== 0) {
        await Product.findByIdAndUpdate(product._id, { $inc: { stock: -quantityDelta } }, { session });
      }

      const purchasePrice = Number(sale.purchasePrice || product.purchasePrice || 0);
      const updated = await this.model.findByIdAndUpdate(
        id,
        {
          ...payload,
          quantity: newQuantity,
          productPrice: newPrice,
          totalPrice: newPrice * newQuantity,
          profit: (newPrice - purchasePrice) * newQuantity
        },
        { new: true, session }
      );

      await session.commitTransaction();
      return updated;
    } catch (error) {
      await session.abortTransaction();
      throw new CustomError(400, 'Sale update failed');
    } finally {
      await session.endSession();
    }
  }

  async deleteSale(id: string, userId: string) {
    const sale = await this.model.findOne({ _id: id, user: new Types.ObjectId(userId) });
    if (!sale) {
      throw new CustomError(404, 'Sale is not found!');
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      await Product.findByIdAndUpdate(sale.product, { $inc: { stock: sale.quantity } }, { session });
      await this.model.findByIdAndDelete(id, { session });
      await session.commitTransaction();
      return sale;
    } catch (error) {
      await session.abortTransaction();
      throw new CustomError(400, 'Sale delete failed');
    } finally {
      await session.endSession();
    }
  }
}

const saleServices = new SaleServices(Sale, 'modelName');
export default saleServices;
