import { PaymentType } from './salePayment.type';

export interface ISale {
  product: string;
  quantity: number;
  buyerName: string;
  date: string;
  price: number;
  paymentType?: PaymentType;
  customer?: string;
  paidAmount?: number;
  dueAmount?: number;
}

export interface ITableSale {
  _id: string;
  product: {
    _id: string;
    name: string;
    price: number;
  }
  productPrice: number;
  productName: string;
  quantity: number;
  buyerName: string;
  date: string;
  totalPrice: number
  profit?: number
  paymentType?: PaymentType
  customer?: string | { _id: string; name?: string; phone?: string }
  paidAmount?: number
  dueAmount?: number
  transactionId?: string | { _id: string }
}
