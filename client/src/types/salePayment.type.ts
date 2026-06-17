export type PaymentType = 'CASH' | 'CREDIT' | 'PARTIAL';

export interface ISaleCheckoutPayload {
  product: string;
  productName: string;
  productPrice: number;
  quantity: number;
  buyerName: string;
  date: string;
  paymentType: PaymentType;
  customer?: string;
  paidAmount: number;
  dueAmount: number;
}
