import { Schema, model } from 'mongoose';
import { IProduct } from './product.interface';

const productSchema = new Schema<IProduct>(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: 'user' },
    seller: { type: Schema.Types.ObjectId, required: true, ref: 'Seller' },
    name: { type: String, required: true, trim: true },
    barcode: { type: String, trim: true },
    price: { type: Number, required: true },
    purchasePrice: { type: Number, required: true },
    salePrice: { type: Number, required: true },
    stock: { type: Number, required: true },
    minStock: { type: Number, default: 5 },
    expireDate: { type: Date },
    location: { type: String },
    description: { type: String }
  },
  { timestamps: true }
);

productSchema.index({ name: 1 });
productSchema.index({ barcode: 1 }, { sparse: true });
productSchema.index({ expireDate: 1 });
productSchema.index({ stock: 1 });
productSchema.index({ seller: 1 });
productSchema.index({ user: 1, name: 1 });

const Product = model<IProduct>('product', productSchema);
export default Product;
