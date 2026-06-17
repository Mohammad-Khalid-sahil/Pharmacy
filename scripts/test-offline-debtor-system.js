'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { LocalRepository } = require('../electron/localRepository');

async function run() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pharmacy-offline-debtor-sys-'));
  const repo = new LocalRepository(tempDir);
  await repo.init();

  const customer = await repo.request({
    url: '/customers',
    method: 'POST',
    body: { name: 'Ahmad Khan', phone: '700111222', address: 'Kabul' },
  });
  if (!customer.success) throw new Error(`Customer create failed: ${customer.message}`);

  const product = await repo.request({
    url: '/products',
    method: 'POST',
    body: { name: 'Panadol', barcode: 'PAN-100', price: 20, purchasePrice: 10, stock: 50, minStock: 5 },
  });
  if (!product.success) throw new Error(`Product create failed: ${product.message}`);

  console.log('1. Manual debt create...');
  const debt1 = await repo.request({
    url: '/customer-debtor-accounts/debt',
    method: 'POST',
    body: {
      customerName: 'Ahmad Khan',
      date: '2026-06-01',
      amount: 1000,
      reason: 'Medicines on credit',
      medicinesTaken: 'Panadol x5, Amoxil x2',
      notes: 'First debt',
    },
  });
  if (!debt1.success) throw new Error(`Debt1 failed: ${debt1.message}`);

  console.log('2. Append debt to same account...');
  const debt2 = await repo.request({
    url: '/customer-debtor-accounts/debt',
    method: 'POST',
    body: {
      customerName: 'ahmad khan',
      date: '2026-06-02',
      amount: 500,
      reason: 'Additional medicines',
      medicinesTaken: 'Ibuprofen x3',
    },
  });
  if (!debt2.success) throw new Error(`Debt2 failed: ${debt2.message}`);

  const sameAccount = debt1.data._id === debt2.data._id;
  const summaryAfterDebt = await repo.request({
    url: '/customer-debtor-accounts/summary',
    method: 'GET',
    params: { status: 'active' },
  });

  console.log('3. Partial payment...');
  const partialPay = await repo.request({
    url: '/customer-debtor-accounts/payment',
    method: 'POST',
    body: { accountId: debt2.data._id, amount: 800, date: '2026-06-03', note: 'Partial payment' },
  });
  if (!partialPay.success) throw new Error(`Partial payment failed: ${partialPay.message}`);

  console.log('4. Credit sale sync...');
  const creditSale = await repo.request({
    url: '/sales/bulk',
    method: 'POST',
    body: {
      customer: customer.data._id,
      buyerName: 'Ahmad Khan',
      paymentType: 'CREDIT',
      paidAmount: 0,
      items: [{ product: product.data._id, quantity: 2, productPrice: 20 }],
    },
  });
  if (!creditSale.success) throw new Error(`Credit sale failed: ${creditSale.message}`);

  const afterSaleAccount = await repo.request({
    url: `/customer-debtor-accounts/${debt2.data._id}`,
    method: 'GET',
  });

  console.log('5. Full payment to settle...');
  const remaining = afterSaleAccount.data.currentDebt;
  const fullPay = await repo.request({
    url: '/customer-debtor-accounts/payment',
    method: 'POST',
    body: { accountId: debt2.data._id, amount: remaining, date: '2026-06-04', note: 'Final payment' },
  });
  if (!fullPay.success) throw new Error(`Full payment failed: ${fullPay.message}`);

  const settledList = await repo.request({
    url: '/customer-debtor-accounts',
    method: 'GET',
    params: { status: 'settled', page: 1, limit: 10 },
  });

  const cashbox = await repo.request({ url: '/cashbox-transactions/summary', method: 'GET' });

  const passed =
    sameAccount &&
    debt2.data.debtEntries.length === 2 &&
    debt2.data.debtEntries[0].medicinesTaken.includes('Panadol') &&
    summaryAfterDebt.data.customers === 1 &&
    summaryAfterDebt.data.totalDebt === 1500 &&
    summaryAfterDebt.data.totalPayments === 0 &&
    partialPay.data.currentDebt === 700 &&
    partialPay.data.totalPayments === 800 &&
    afterSaleAccount.data.currentDebt === 740 &&
    afterSaleAccount.data.debtEntries.some((entry) => String(entry.reason).includes('Credit sale')) &&
    fullPay.data.status === 'SETTLED' &&
    settledList.meta.total === 1 &&
    cashbox.data.cashIn === 1540;

  console.log(passed ? 'ALL OFFLINE DEBTOR SYSTEM TESTS PASSED' : 'TESTS FAILED');
  if (!passed) {
    console.log({
      sameAccount,
      summaryAfterDebt: summaryAfterDebt.data,
      partialBalance: partialPay.data.currentDebt,
      afterSaleBalance: afterSaleAccount.data.currentDebt,
      finalStatus: fullPay.data.status,
      cashIn: cashbox.data.cashIn,
    });
  }

  fs.rmSync(tempDir, { recursive: true, force: true });
  process.exit(passed ? 0 : 1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
