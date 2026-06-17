export const CustomerLedgerType = {
  DEBIT: 'DEBIT',
  CREDIT: 'CREDIT',
  ADJUSTMENT: 'ADJUSTMENT'
} as const;

export type TCustomerLedgerType = (typeof CustomerLedgerType)[keyof typeof CustomerLedgerType];

export const SellerLedgerType = {
  PURCHASE: 'PURCHASE',
  PAYMENT: 'PAYMENT',
  ADJUSTMENT: 'ADJUSTMENT'
} as const;

export type TSellerLedgerType = (typeof SellerLedgerType)[keyof typeof SellerLedgerType];

export const CashboxDirection = {
  IN: 'IN',
  OUT: 'OUT'
} as const;

export type TCashboxDirection = (typeof CashboxDirection)[keyof typeof CashboxDirection];

export const RecordStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
} as const;

export type TRecordStatus = (typeof RecordStatus)[keyof typeof RecordStatus];
