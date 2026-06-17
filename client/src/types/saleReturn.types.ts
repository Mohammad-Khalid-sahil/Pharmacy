export interface ISaleReturnItem {
  product: string;
  quantity: number;
  refundAmount: number;
}

export interface ISaleReturn {
  _id: string;
  sale: string | { _id: string; productName?: string; buyerName?: string };
  productName?: string;
  customerName?: string;
  quantity?: number;
  amount?: number;
  customer?: string | { _id: string; name: string; phone?: string };
  items: ISaleReturnItem[];
  totalRefund: number;
  reason?: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ISaleReturnCreatePayload {
  sale: string;
  customer?: string;
  items: ISaleReturnItem[];
  totalRefund: number;
  reason?: string;
  note?: string;
}
