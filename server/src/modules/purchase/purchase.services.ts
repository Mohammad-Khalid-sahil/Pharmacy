/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Types } from 'mongoose';
import BaseServices from '../baseServices';
import { IPurchase } from './purchase.interface';
import Purchase from './purchase.model';
import SellerLedger from '../sellerLedger/sellerLedger.model';
import Product from '../product/product.model';
import CashboxTransaction from '../cashboxTransaction/cashboxTransaction.model';
import { CashboxDirection, SellerLedgerType } from '../../constant/ledgerTypes';
import sortAndPaginatePipeline from '../../lib/sortAndPaginate.pipeline';
import CustomError from '../../errors/customError';
import logActivity from '../../lib/logActivity';

class PurchaseServices extends BaseServices<any> {
  constructor(model: any, modelName: string) {
    super(model, modelName);
  }

  private paymentStatus(totalPrice: number, paid: number) {
    if (paid >= totalPrice) return 'PAID';
    if (paid > 0) return 'PARTIAL';
    return 'UNPAID';
  }

  /**
   * Create new sale and decrease product stock
   */
  async create(payload: IPurchase, userId: string) {
    const purchase = await this.persistCreate(payload, userId);
    await logActivity({
      userId,
      action: 'STOCK_IN',
      module: 'stock',
      recordId: String(purchase.product),
      newData: { quantity: purchase.quantity, purchase: purchase._id, productName: purchase.productName },
      description: `Purchase stock in: ${purchase.productName}`
    });
    return purchase;
  }

  private isTransactionUnsupported(error: unknown) {
    const err = error as { code?: number; message?: string };
    return (
      err?.code === 20 ||
      Boolean(err?.message?.includes('Transaction numbers are only allowed')) ||
      Boolean(err?.message?.includes('replica set'))
    );
  }

  private async createCashboxForPaidPurchase(purchase: any, paid: number, userId: string, session?: mongoose.ClientSession) {
    if (paid <= 0) return;
    await CashboxTransaction.create(
      [
        {
          type: 'PURCHASE_PAYMENT',
          direction: CashboxDirection.OUT,
          amount: paid,
          sourceModule: 'purchase',
          referenceId: purchase._id,
          description: `Purchase payment: ${purchase.productName}`,
          createdBy: userId
        }
      ],
      session ? { session } : undefined
    );
  }

  private async createLedgerForPurchase(purchase: any, paid: number, userId: string, session?: mongoose.ClientSession) {
    const ledgerRows = [
      {
        seller: purchase.seller,
        purchase: purchase._id,
        type: SellerLedgerType.PURCHASE,
        amount: purchase.totalPrice,
        debit: purchase.totalPrice,
        credit: 0,
        description: `Purchase: ${purchase.productName}`,
        createdBy: userId
      }
    ];

    if (paid > 0) {
      ledgerRows.push({
        seller: purchase.seller,
        purchase: purchase._id,
        type: SellerLedgerType.PAYMENT,
        amount: paid,
        debit: 0,
        credit: paid,
        description: `Purchase payment: ${purchase.productName}`,
        createdBy: userId
      });
    }

    await SellerLedger.create(ledgerRows, session ? { session } : undefined);
  }

  private async persistPurchase(payload: IPurchase, userId: string, session?: mongoose.ClientSession) {
    const quantity = Number(payload.quantity);
    const unitPrice = Number(payload.unitPrice);
    const paid = Number(payload.paid || 0);
    if (quantity <= 0 || unitPrice <= 0) throw new CustomError(400, 'Quantity and unit price must be greater than zero');
    const totalPrice = unitPrice * quantity;
    if (paid < 0 || paid > totalPrice) throw new CustomError(400, 'Paid amount must be between zero and total purchase amount');

    const product = await Product.findOne({ _id: payload.product, user: new Types.ObjectId(userId) }).session(session || null);
    if (!product) throw new CustomError(404, 'Product is not found!');

    const purchasePayload = {
      ...payload,
      user: new Types.ObjectId(userId),
      quantity,
      unitPrice,
      totalPrice,
      paid,
      paymentStatus: this.paymentStatus(totalPrice, paid),
      purchaseDate: payload.purchaseDate ? new Date(payload.purchaseDate) : new Date()
    };

    await Product.findByIdAndUpdate(product._id, { $inc: { stock: quantity } }, { session });
    const created = session
      ? await this.model.create([purchasePayload], { session })
      : await this.model.create(purchasePayload);
    const purchase = Array.isArray(created) ? created[0] : created;

    await this.createLedgerForPurchase(purchase, paid, userId, session);
    await this.createCashboxForPaidPurchase(purchase, paid, userId, session);

    return purchase;
  }

  private async persistCreate(payload: IPurchase, userId: string) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const purchase = await this.persistPurchase(payload, userId, session);
      await session.commitTransaction();
      return purchase;
    } catch (error) {
      try {
        await session.abortTransaction();
      } catch {
        /* no active transaction */
      }

      if (this.isTransactionUnsupported(error)) {
        return this.persistPurchase(payload, userId);
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Read all category of user
   */
  async getAll(userId: string, query: Record<string, unknown>) {
    const search = query.search ? query.search : '';

    const data = await this.model.aggregate([
      {
        $match: {
          user: new Types.ObjectId(userId),
          $or: [{ sellerName: { $regex: search, $options: 'i' } }, { productName: { $regex: search, $options: 'i' } }]
        }
      },
      ...sortAndPaginatePipeline(query)
    ]);

    const totalCount = await this.model.find({ user: userId }).countDocuments();

    return { data, totalCount };
  }

  async updatePurchase(id: string, payload: Partial<IPurchase>, userId: string) {
    const current = await this.model.findOne({ _id: id, user: new Types.ObjectId(userId) });
    if (!current) throw new CustomError(404, 'Purchase is not found!');

    const quantity = Number(payload.quantity ?? current.quantity);
    const unitPrice = Number(payload.unitPrice ?? current.unitPrice);
    const paid = Number(payload.paid ?? current.paid ?? 0);
    if (quantity <= 0 || unitPrice <= 0) throw new CustomError(400, 'Quantity and unit price must be greater than zero');
    const totalPrice = quantity * unitPrice;
    if (paid < 0 || paid > totalPrice) throw new CustomError(400, 'Paid amount must be between zero and total purchase amount');

    const productId = payload.product || current.product;
    const product = await Product.findOne({ _id: productId, user: new Types.ObjectId(userId) });
    if (!product) throw new CustomError(404, 'Product is not found!');

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      if (String(current.product) === String(productId)) {
        const delta = quantity - current.quantity;
        if (delta < 0 && product.stock < Math.abs(delta)) throw new CustomError(400, 'Stock cannot be reduced below zero');
        if (delta !== 0) await Product.findByIdAndUpdate(productId, { $inc: { stock: delta } }, { session });
      } else {
        const oldProduct = await Product.findOne({ _id: current.product, user: new Types.ObjectId(userId) }).session(session);
        if (!oldProduct || oldProduct.stock < current.quantity) throw new CustomError(400, 'Stock cannot be reduced below zero');
        await Product.findByIdAndUpdate(current.product, { $inc: { stock: -current.quantity } }, { session });
        await Product.findByIdAndUpdate(productId, { $inc: { stock: quantity } }, { session });
      }

      const updated = await this.model.findByIdAndUpdate(
        id,
        {
          ...payload,
          quantity,
          unitPrice,
          paid,
          totalPrice,
          paymentStatus: this.paymentStatus(totalPrice, paid),
          purchaseDate: payload.purchaseDate ? new Date(payload.purchaseDate) : current.purchaseDate
        },
        { new: true, session }
      );

      await SellerLedger.deleteMany({ purchase: current._id, createdBy: new Types.ObjectId(userId) }, { session });
      await this.createLedgerForPurchase(updated, paid, userId, session);

      if (paid > 0) {
        await CashboxTransaction.findOneAndUpdate(
          { sourceModule: 'purchase', referenceId: current._id, createdBy: new Types.ObjectId(userId) },
          {
            type: 'PURCHASE_PAYMENT',
            direction: CashboxDirection.OUT,
            amount: paid,
            description: `Purchase payment: ${updated.productName}`
          },
          { upsert: true, session }
        );
      } else {
        await CashboxTransaction.deleteOne(
          { sourceModule: 'purchase', referenceId: current._id, createdBy: new Types.ObjectId(userId) },
          { session }
        );
      }

      await session.commitTransaction();
      await logActivity({
        userId,
        action: 'STOCK_PURCHASE_UPDATE',
        module: 'stock',
        recordId: String(productId),
        oldData: { quantity: current.quantity, product: current.product },
        newData: { quantity, product: productId },
        description: `Purchase stock adjusted: ${updated.productName}`
      });
      return updated;
    } catch (error) {
      try {
        await session.abortTransaction();
      } catch {
        /* no active transaction */
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async deletePurchase(id: string, userId: string) {
    const purchase = await this.model.findOne({ _id: id, user: new Types.ObjectId(userId) });
    if (!purchase) throw new CustomError(404, 'Purchase is not found!');

    const product = await Product.findOne({ _id: purchase.product, user: new Types.ObjectId(userId) });
    if (!product) throw new CustomError(404, 'Product is not found!');
    if (product.stock < purchase.quantity) throw new CustomError(400, 'Stock cannot be reduced below zero');

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      await Product.findByIdAndUpdate(purchase.product, { $inc: { stock: -purchase.quantity } }, { session });
      await SellerLedger.deleteMany({ purchase: purchase._id, createdBy: new Types.ObjectId(userId) }, { session });
      await CashboxTransaction.deleteMany({ sourceModule: 'purchase', referenceId: purchase._id, createdBy: new Types.ObjectId(userId) }, { session });
      await this.model.deleteOne({ _id: purchase._id }, { session });
      await session.commitTransaction();
      await logActivity({
        userId,
        action: 'STOCK_PURCHASE_DELETE',
        module: 'stock',
        recordId: String(purchase.product),
        oldData: { quantity: purchase.quantity, purchase: purchase._id, productName: purchase.productName },
        description: `Purchase stock removed: ${purchase.productName}`
      });
      return purchase;
    } catch (error) {
      try {
        await session.abortTransaction();
      } catch {
        /* no active transaction */
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }
}

const purchaseServices = new PurchaseServices(Purchase, 'Purchase');
export default purchaseServices;
