'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { LocalRepository } = require('../electron/localRepository');

async function run() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pharmacy-offline-reports-'));
  const repo = new LocalRepository(tempDir);
  await repo.init();

  const product = await repo.request({
    url: '/products',
    method: 'POST',
    body: { name: 'Aspirin', barcode: 'ASP-001', price: 30, purchasePrice: 10, stock: 100, minStock: 5 },
  });
  if (!product.success) throw new Error(`Product failed: ${product.message}`);

  const seller = await repo.request({
    url: '/sellers',
    method: 'POST',
    body: { name: 'MedCo', email: 'medco@test.local', contactNo: '700000010' },
  });

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const sale1 = await repo.request({
    url: '/sales',
    method: 'POST',
    body: { product: product.data._id, quantity: 2, productPrice: 30, date: todayKey, paidAmount: 60 },
  });
  const sale2 = await repo.request({
    url: '/sales',
    method: 'POST',
    body: { product: product.data._id, quantity: 1, productPrice: 30, date: todayKey, paidAmount: 30 },
  });
  if (!sale1.success || !sale2.success) throw new Error('Sales failed');

  const purchase = await repo.request({
    url: '/purchases',
    method: 'POST',
    body: { product: product.data._id, seller: seller.data._id, quantity: 10, unitPrice: 10, paid: 100 },
  });
  if (!purchase.success) throw new Error(`Purchase failed: ${purchase.message}`);

  const expense = await repo.request({
    url: '/expenses',
    method: 'POST',
    body: { title: 'Rent', amount: 50, date: todayKey, note: 'Shop rent' },
  });
  if (!expense.success) throw new Error(`Expense failed: ${expense.message}`);

  const daily = await repo.request({ url: '/sales/days', method: 'GET' });
  const weekly = await repo.request({ url: '/sales/weeks', method: 'GET' });
  const monthly = await repo.request({ url: '/sales/months', method: 'GET' });
  const yearly = await repo.request({ url: '/sales/years', method: 'GET' });
  const cashbox = await repo.request({ url: '/cashbox-transactions/summary', method: 'GET' });
  const expensesSummary = await repo.request({ url: '/expenses/summary', method: 'GET' });
  const products = await repo.request({ url: '/products', method: 'GET', params: { limit: 100 } });
  const lowStock = await repo.request({ url: '/products/alerts/low-stock', method: 'GET' });

  const expectedRevenue = 90;
  const expectedQuantity = 3;
  const expectedProfit = (30 - 10) * 2 + (30 - 10) * 1;

  const todayRow = daily.data.find((row) => row.year === today.getFullYear() && row.month === today.getMonth() + 1 && row.day === today.getDate());
  const dailyOk = todayRow && todayRow.totalRevenue === expectedRevenue && todayRow.totalQuantity === expectedQuantity && todayRow.totalProfit === expectedProfit;
  const weeklyOk = weekly.data.some((row) => row.totalRevenue === expectedRevenue);
  const monthlyOk = monthly.data.some((row) => row.totalRevenue === expectedRevenue);
  const yearlyOk = yearly.data.some((row) => row.totalRevenue === expectedRevenue);
  const cashboxOk = cashbox.data.cashIn >= expectedRevenue;
  const expenseOk = expensesSummary.data.todayExpense === 50;
  const inventoryOk = products.data.some((p) => p._id === product.data._id && Number(p.stock) === 107);

  const passed = dailyOk && weeklyOk && monthlyOk && yearlyOk && cashboxOk && expenseOk && inventoryOk;

  console.log(passed ? 'ALL OFFLINE REPORT TESTS PASSED' : 'TESTS FAILED');
  if (!passed) {
    console.log({
      dailyOk,
      weeklyOk,
      monthlyOk,
      yearlyOk,
      cashboxOk,
      expenseOk,
      inventoryOk,
      todayRow,
      daily: daily.data,
      weekly: weekly.data,
      cashbox: cashbox.data,
      expensesSummary: expensesSummary.data,
      stock: products.data.find((p) => p._id === product.data._id)?.stock,
    });
  }

  fs.rmSync(tempDir, { recursive: true, force: true });
  process.exit(passed ? 0 : 1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
