'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { LocalRepository } = require('../electron/localRepository');

async function run() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pharmacy-offline-purchase-'));
  const repo = new LocalRepository(tempDir);
  await repo.init();

  const seller = await repo.request({
    url: '/sellers',
    method: 'POST',
    body: { name: 'MedSupply Co', email: 'med@test.local', contactNo: '700000002' },
  });
  if (!seller.success) throw new Error(`Seller create failed: ${seller.message}`);

  const product = await repo.request({
    url: '/products',
    method: 'POST',
    body: {
      name: 'Amoxicillin',
      barcode: 'AMX-001',
      price: 20,
      purchasePrice: 10,
      stock: 0,
      minStock: 5,
      seller: seller.data._id,
    },
  });
  if (!product.success) throw new Error(`Product create failed: ${product.message}`);

  const unpaid = await repo.request({
    url: '/purchases',
    method: 'POST',
    body: {
      product: product.data._id,
      seller: seller.data._id,
      quantity: 10,
      unitPrice: 100,
      paid: 0,
    },
  });
  if (!unpaid.success) throw new Error(`Unpaid purchase failed: ${unpaid.message}`);

  const partial = await repo.request({
    url: '/purchases',
    method: 'POST',
    body: {
      product: product.data._id,
      seller: seller.data._id,
      quantity: 5,
      unitPrice: 100,
      paid: 200,
    },
  });
  if (!partial.success) throw new Error(`Partial purchase failed: ${partial.message}`);

  let summary = await repo.request({ url: '/purchases/summary', method: 'GET' });
  if (!summary.success) throw new Error(`Summary failed: ${summary.message}`);

  const afterCreate =
    summary.data.totalPurchases === 1500 &&
    summary.data.totalPayments === 200 &&
    summary.data.remaining === 1300;

  const productAfter = await repo.request({ url: `/products/${product.data._id}`, method: 'GET' });
  const stockOk = productAfter.data.stock === 15;

  const partialPayment = await repo.request({
    url: '/seller-payments',
    method: 'POST',
    body: { seller: seller.data._id, amount: 800, note: 'Partial company payment' },
  });
  if (!partialPayment.success) throw new Error(`Partial seller payment failed: ${partialPayment.message}`);

  summary = await repo.request({ url: '/purchases/summary', method: 'GET' });
  const afterPartialPay =
    summary.data.totalPurchases === 1500 &&
    summary.data.totalPayments === 1000 &&
    summary.data.remaining === 500;

  const fullPayment = await repo.request({
    url: '/seller-payments',
    method: 'POST',
    body: { seller: seller.data._id, amount: 500, note: 'Final company payment' },
  });
  if (!fullPayment.success) throw new Error(`Full seller payment failed: ${fullPayment.message}`);

  summary = await repo.request({ url: '/purchases/summary', method: 'GET' });
  const afterFullPay =
    summary.data.totalPurchases === 1500 &&
    summary.data.totalPayments === 1500 &&
    summary.data.remaining === 0;

  const purchases = await repo.request({ url: '/purchases', method: 'GET', params: { page: 1, limit: 10 } });
  const listSummaryOk =
    purchases.summary?.totalPurchases === 1500 &&
    purchases.summary?.totalPayments === 1500 &&
    purchases.summary?.remaining === 0;

  const allPaid = purchases.data.every((row) => row.paymentStatus === 'PAID' && row.paid === row.totalPrice);

  const sellerBalance = await repo.request({
    url: `/seller-ledgers/balance/${seller.data._id}`,
    method: 'GET',
  });
  const balanceOk =
    sellerBalance.data.purchases === 1500 &&
    sellerBalance.data.payments === 1500 &&
    sellerBalance.data.balance === 0;

  const cashbox = await repo.request({ url: '/cashbox-transactions/summary', method: 'GET' });
  const cashboxOk = cashbox.data.cashOut === 1500;

  const restart = new LocalRepository(tempDir);
  await restart.init();
  const afterRestart = await restart.request({ url: '/purchases/summary', method: 'GET' });
  const persistOk =
    afterRestart.data.totalPurchases === 1500 &&
    afterRestart.data.totalPayments === 1500 &&
    afterRestart.data.remaining === 0;

  const passed =
    afterCreate &&
    stockOk &&
    afterPartialPay &&
    afterFullPay &&
    listSummaryOk &&
    allPaid &&
    balanceOk &&
    cashboxOk &&
    persistOk &&
    unpaid.data.paymentStatus === 'UNPAID' &&
    partial.data.paymentStatus === 'PARTIAL';

  console.log(passed ? 'ALL OFFLINE PURCHASE TESTS PASSED' : 'TESTS FAILED');
  if (!passed) {
    console.log({
      afterCreate,
      stockOk,
      afterPartialPay,
      afterFullPay,
      listSummaryOk,
      allPaid,
      balanceOk,
      cashboxOk,
      persistOk,
      summary: summary.data,
      purchases: purchases.data.map((row) => ({
        paid: row.paid,
        totalPrice: row.totalPrice,
        paymentStatus: row.paymentStatus,
      })),
    });
  }

  fs.rmSync(tempDir, { recursive: true, force: true });
  process.exit(passed ? 0 : 1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
