export type IPrescriptionItem = {
  product: string | { _id: string; name: string; price?: number; stock?: number };
  productId?: string;
  productName?: string;
  medicineName?: string;
  quantity: number;
  salePrice?: number;
  sellingPrice?: number;
  subtotal?: number;
  dosage?: string;
  instruction?: string;
};

export type IPrescription = {
  _id: string;
  customer?: string | { _id: string; name: string; phone?: string };
  customerName?: string;
  customerPhone?: string;
  doctorName?: string;
  patientName?: string;
  note?: string;
  prescriptionDate?: string;
  saleDeleted?: boolean;
  linkedSaleDeleted?: boolean;
  sale?: string | {
    _id: string;
    productName?: string;
    buyerName?: string;
    transactionId?: string;
    paymentType?: string;
    paidAmount?: number;
    dueAmount?: number;
    totalPrice?: number;
    date?: string;
  };
  items: IPrescriptionItem[];
  totalAmount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CreatePrescriptionPayload = {
  customer?: string;
  doctorName?: string;
  patientName?: string;
  note?: string;
  sale?: string;
  items: {
    product: string;
    quantity: number;
    dosage?: string;
    instruction?: string;
  }[];
  totalAmount: number;
};
