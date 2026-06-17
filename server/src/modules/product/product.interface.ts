import { Types } from 'mongoose';

export interface IProduct {
  user: Types.ObjectId;
  name: string;
  barcode?: string;
  seller: Types.ObjectId;
  price: number;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock?: number;
  expireDate?: Date;
  location?: string;
  description?: string;
}
