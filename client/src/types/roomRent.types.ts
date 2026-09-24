export type RoomRentNeighborType = 'DOCTOR' | 'LABORATORY';

export type RoomRentUnpaidMonth = {
  _id: string;
  date?: string;
  amount: number;
  period?: string;
  note?: string;
  createdAt?: string;
};

export type RoomRentPayment = {
  _id: string;
  date?: string;
  amount: number;
  note?: string;
  createdAt?: string;
};

export type IRoomRentAccount = {
  _id: string;
  neighborName: string;
  neighborType: RoomRentNeighborType;
  monthlyRent: number;
  unpaidMonths: number;
  totalDebt: number;
  totalPayments: number;
  remainingBalance: number;
  unpaidMonthEntries: RoomRentUnpaidMonth[];
  paymentEntries: RoomRentPayment[];
  createdAt?: string;
  updatedAt?: string;
};

export type CreateRoomRentAccountPayload = {
  neighborName: string;
  neighborType: RoomRentNeighborType;
  monthlyRent: number;
};

export type RoomRentSummary = {
  totalDebt: number;
  totalPayments: number;
  remainingBalance: number;
};
