export type ISalaryPayment = {
  _id: string;
  employee: string | { _id: string; name: string };
  amount: number;
  paymentDate?: string;
  note?: string;
  createdAt?: string;
};

export type CreateSalaryPaymentPayload = {
  employee: string;
  amount: number;
  paymentDate?: string;
  note?: string;
};
