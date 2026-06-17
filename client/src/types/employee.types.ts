export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';

export type IEmployee = {
  _id: string;
  name: string;
  phone?: string;
  position?: string;
  salary?: number;
  address?: string;
  note?: string;
  status?: EmployeeStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type EmployeePayload = {
  name: string;
  phone?: string;
  position?: string;
  salary?: number;
  address?: string;
  note?: string;
  status?: EmployeeStatus;
};
