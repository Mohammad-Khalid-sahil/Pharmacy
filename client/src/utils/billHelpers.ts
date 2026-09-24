export function formatBillNumber(transactionId?: string, fallbackId?: string): string {
  const raw = String(transactionId || fallbackId || '').trim();
  if (!raw) return '00000';
  const compact = raw.replace(/^transaction_/i, '').replace(/[^a-zA-Z0-9]/g, '');
  let code = 0;
  for (let i = 0; i < compact.length; i += 1) {
    code = (Math.imul(33, code) + compact.charCodeAt(i)) >>> 0;
  }
  return String((code % 90000) + 10000);
}

export function buildSaleBillData(input: {
  buyerName: string;
  date: string;
  items: Array<{
    key?: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalAmount: number;
  transactionId?: string;
  saleId?: string;
}) {
  const billNumber = formatBillNumber(input.transactionId, input.saleId);
  return {
    ...input,
    billNumber,
    transactionId: input.transactionId,
  };
}
