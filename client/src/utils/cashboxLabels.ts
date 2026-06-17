type CashboxRow = {
  transactionType?: string;
  type?: string;
  reason?: string;
  notes?: string;
  note?: string;
  description?: string;
  language?: string;
};

const typeKeyMap: Record<string, string> = {
  SALE_INCOME: 'cashboxReasonMedicineSale',
  PURCHASE_PAYMENT: 'cashboxReasonPurchase',
  DEBT_PAYMENT: 'cashboxReasonCustomerDebtPayment',
  COMPANY_DEBT_PAYMENT: 'cashboxReasonCompanyDebtPayment',
  EXPENSE: 'cashboxReasonExpense',
  SALARY_PAYMENT: 'cashboxReasonEmployeeSalary',
  PERSON_DEPOSIT: 'cashboxReasonCashDeposit',
  PERSON_WITHDRAWAL: 'cashboxReasonCashWithdrawal',
  SALE_RETURN: 'cashboxReasonSaleReturn',
  TRANSFER: 'cashboxReasonMoneyTransfer',
  MANUAL: 'cashboxReasonManual',
  MONEY_TRANSFER: 'cashboxReasonMoneyTransfer',
};

export const cashboxTransactionType = (row: CashboxRow) =>
  row.transactionType || row.type || 'MANUAL';

export const cashboxReferenceLabel = (row: CashboxRow, t: (key: string) => string) => {
  const key = typeKeyMap[cashboxTransactionType(row)];
  return key ? t(key) : cashboxTransactionType(row);
};

export const cashboxReasonLabel = (row: CashboxRow, t: (key: string) => string) => {
  const key = typeKeyMap[cashboxTransactionType(row)];
  if (key) return t(key);
  return row.reason?.trim() || t('cashboxReasonManual');
};

export const cashboxNoteLabel = (row: CashboxRow, t: (key: string) => string) => {
  const detail = String(row.notes || row.note || row.description || '').trim();
  const prefixKey = typeKeyMap[cashboxTransactionType(row)];
  const localizedPrefix = prefixKey ? t(prefixKey) : '';
  if (!detail) return localizedPrefix || t('notAvailable');
  const colonIdx = detail.indexOf(':');
  if (colonIdx > 0) {
    const suffix = detail.slice(colonIdx + 1).trim();
    return suffix ? `${localizedPrefix}: ${suffix}` : localizedPrefix;
  }
  return localizedPrefix ? `${localizedPrefix}: ${detail}` : detail;
};
