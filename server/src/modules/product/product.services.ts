/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import sortAndPaginatePipeline from '../../lib/sortAndPaginate.pipeline';
import BaseServices from '../baseServices';
import Product from './product.model';
import matchStagePipeline from './product.aggregation.pipeline';
import CustomError from '../../errors/customError';
import Purchase from '../purchase/purchase.model';
import Seller from '../seller/seller.model';
import SellerLedger from '../sellerLedger/sellerLedger.model';
import { SellerLedgerType } from '../../constant/ledgerTypes';
import { IProduct } from './product.interface';
import logActivity from '../../lib/logActivity';

class ProductServices extends BaseServices<any> {
  constructor(model: any, modelName: string) {
    super(model, modelName);
  }

  private async recordPurchaseLedger(purchase: any, userId: string, paid = 0) {
    await SellerLedger.create({
      seller: purchase.seller,
      purchase: purchase._id,
      type: SellerLedgerType.PURCHASE,
      amount: purchase.totalPrice,
      debit: Math.max(purchase.totalPrice - paid, 0),
      credit: paid,
      description: `Purchase: ${purchase.productName}`,
      createdBy: userId
    });
  }

  /**
   * Create new product
   */
  async create(payload: IProduct, userId: string) {
    type str = keyof IProduct;
    (Object.keys(payload) as str[]).forEach((key: str) => {
      if (payload[key] === '') {
        delete payload[key];
      }
    });

    payload.user = new Types.ObjectId(userId);
    payload.purchasePrice = Number(payload.purchasePrice || payload.price);
    payload.salePrice = Number(payload.salePrice || payload.price);
    payload.price = payload.salePrice;

    try {
      const seller = await Seller.findById(payload.seller);
      const product: any = await this.model.create(payload);

      const purchase = await Purchase.create({
        user: userId,
        seller: product.seller,
        product: product._id,
        sellerName: seller?.name,
        productName: product.name,
        quantity: product.stock,
        unitPrice: product.purchasePrice,
        totalPrice: product.stock * product.purchasePrice,
        paid: 0
      });
      await this.recordPurchaseLedger(purchase, userId);
      await logActivity({
        userId,
        action: 'STOCK_INITIAL',
        module: 'stock',
        recordId: String(product._id),
        newData: { quantity: product.stock, purchase: purchase._id, productName: product.name },
        description: `Initial stock: ${product.name}`
      });

      return product;
    } catch (error) {
      console.log(error);
      throw new CustomError(400, 'Product create failed');
    }
  }

  /**
   * Count Total Product
   */
  async countTotalProduct(userId: string) {
    return this.model.aggregate([
      {
        $match: {
          user: new Types.ObjectId(userId)
        }
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$stock' }
        }
      },
      {
        $project: {
          totalQuantity: 1,
          _id: 0
        }
      }
    ]);
  }

  /**
   * Get All product of user
   */
  async readAll(query: Record<string, unknown> = {}, userId: string) {
    let data = await this.model.aggregate([...matchStagePipeline(query, userId), ...sortAndPaginatePipeline(query)]);

    const totalCount = await this.model.aggregate([
      ...matchStagePipeline(query, userId),
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

    data = await this.model.populate(data, { path: 'seller', select: '-__v -user -createdAt -updatedAt' });

    return { data, totalCount };
  }

  /**
   * Get Single product of user
   */
  async read(id: string, userId: string) {
    await this._isExists(id);
    return this.model.findOne({ user: new Types.ObjectId(userId), _id: id });
  }

  /**
   * Multiple delete
   */
  async bulkDelete(payload: string[]) {
    const data = payload.map((item) => new Types.ObjectId(item));

    return this.model.deleteMany({ _id: { $in: data } });
  }

  /**
   * Add product stock
   */
  async addToStock(id: string, payload: Pick<IProduct, 'seller' | 'stock'>, userId: string) {
    try {
      const currentProduct: any = await this.model.findById(id);
      const seller = await Seller.findById(payload.seller || currentProduct?.seller);
      const product: any = await this.model.findByIdAndUpdate(
        id,
        { $inc: { stock: payload.stock } },
        { new: true }
      );

      const purchase = await Purchase.create({
        user: userId,
        seller: product.seller,
        product: product._id,
        sellerName: seller?.name,
        productName: product.name,
        quantity: Number(payload.stock),
        unitPrice: Number(product.purchasePrice || product.price),
        totalPrice: Number(payload.stock) * Number(product.purchasePrice || product.price),
        paid: 0
      });
      await this.recordPurchaseLedger(purchase, userId);
      await logActivity({
        userId,
        action: 'STOCK_IN',
        module: 'stock',
        recordId: String(product._id),
        newData: { quantity: Number(payload.stock), purchase: purchase._id, productName: product.name },
        description: `Added stock: ${product.name}`
      });

      return product;
    } catch (error) {
      console.log(error);
      throw new CustomError(400, 'Product create failed');
    }
  }

  async getLowStock(userId: string) {
    return this.model
      .find({
        user: new Types.ObjectId(userId),
        $expr: { $lte: ['$stock', { $ifNull: ['$minStock', 5] }] }
      })
      .populate('seller', 'name')
      .sort({ stock: 1 });
  }

  async getExpiring(userId: string, days = 30) {
    const until = new Date();
    until.setDate(until.getDate() + Number(days));

    return this.model
      .find({
        user: new Types.ObjectId(userId),
        expireDate: { $exists: true, $ne: null, $gte: new Date(), $lte: until }
      })
      .sort({ expireDate: 1 });
  }
}

const productServices = new ProductServices(Product, 'Product');
export default productServices;
