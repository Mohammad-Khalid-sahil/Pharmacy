export type EmployeeLoanType = 'LOAN' | 'REPAYMENT';

export type IEmployeeLoan = {
  _id: string;
  employee: string;
  employeeName?: string;
  transactionType: EmployeeLoanType;
  amount: number;
  date?: string;
  note?: string;
  createdAt?: string;
};

export type CreateEmployeeLoanPayload = {
  employee: string;
  transactionType: EmployeeLoanType;
  amount: number;
  date?: string;
  note?: string;
};
