'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { LocalRepository } = require('../electron/localRepository');

async function assertBalance(repo, expected, label) {
  const summary = await repo.request({ url: '/cashbox-transactions/summary', method: 'GET' });
  if (!summary.success) throw new Error(`${label}: summary failed`);
  if (Math.abs(Number(summary.data.balance) - expected) > 0.01) {
    throw new Error(`${label}: expected balance ${expected}, got ${summary.data.balance}`);
  }
}

async function run() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pharmacy-offline-cashbox-'));
  const repo = new LocalRepository(tempDir);
  await repo.init();

  const seller = await repo.request({
    url: '/sellers',
    method: 'POST',
    body: { name: 'CashCo', email: 'cash@test.local', contactNo: '700000099' },
  });
  const customer = await repo.request({
    url: '/customers',
    method: 'POST',
    body: { name: 'Debtor Ali', phone: '700111222' },
  });
  const employee = await repo.request({
    url: '/employees',
    method: 'POST',
    body: { name: 'Staff One', salary: 5000 },
  });
  const product = await repo.request({
    url: '/products',
    method: 'POST',
    body: {
      name: 'CashMed',
      barcode: 'CASH-001',
      price: 20,
      purchasePrice: 10,
      stock: 100,
      minStock: 5,
      seller: seller.data._id,
    },
  });

  let balance = 0;

  // 1. Cash sale
  const sale = await repo.request({
    url: '/sales',
    method: 'POST',
    body: {
      product: product.data._id,
      quantity: 2,
      productPrice: 20,
      paidAmount: 40,
      dueAmount: 0,
      buyerName: 'Walk-in',
    },
  });
  if (!sale.success) throw new Error(`Sale failed: ${sale.message}`);
  balance += 40;
  await assertBalance(repo, balance, 'After sale');

  const txAfterSale = await repo.request({ url: '/cashbox-transactions', method: 'GET' });
  const saleTx = txAfterSale.data.find((row) => row.transactionType === 'SALE_INCOME');
  if (!saleTx) throw new Error('SALE_INCOME transaction missing');
  if (saleTx.balanceAfter !== balance) throw new Error('Sale balanceAfter mismatch');

  // 2. Credit sale - no cashbox change
  const creditSale = await repo.request({
    url: '/sales',
    method: 'POST',
    body: {
      product: product.data._id,
      quantity: 1,
      productPrice: 20,
      paidAmount: 0,
      dueAmount: 20,
      buyerName: 'Credit Buyer',
      customer: customer.data._id,
    },
  });
  if (!creditSale.success) throw new Error(`Credit sale failed: ${creditSale.message}`);
  await assertBalance(repo, balance, 'After credit sale');

  // 3. Debt payment
  const debtPay = await repo.request({
    url: '/customer-payments',
    method: 'POST',
    body: { customer: customer.data._id, amount: 20, note: 'Debt settle' },
  });
  if (!debtPay.success) throw new Error(`Debt payment failed: ${debtPay.message}`);
  balance += 20;
  await assertBalance(repo, balance, 'After debt payment');

  // 4. Purchase with payment
  const purchase = await repo.request({
    url: '/purchases',
    method: 'POST',
    body: {
      product: product.data._id,
      seller: seller.data._id,
      quantity: 10,
      unitPrice: 10,
      paid: 50,
    },
  });
  if (!purchase.success) throw new Error(`Purchase failed: ${purchase.message}`);
  balance -= 50;
  await assertBalance(repo, balance, 'After purchase payment');

  // 5. Company debt payment
  const sellerPay = await repo.request({
    url: '/seller-payments',
    method: 'POST',
    body: { seller: seller.data._id, amount: 10, note: 'Partial company pay' },
  });
  if (!sellerPay.success) throw new Error(`Seller payment failed: ${sellerPay.message}`);
  balance -= 10;
  await assertBalance(repo, balance, 'After company debt payment');

  // 6. Expense
  const expense = await repo.request({
    url: '/expenses',
    method: 'POST',
    body: { amount: 15, note: 'Rent', category: 'Rent' },
  });
  if (!expense.success) throw new Error(`Expense failed: ${expense.message}`);
  balance -= 15;
  await assertBalance(repo, balance, 'After expense');

  // 7. Salary
  const salary = await repo.request({
    url: '/salary-payments',
    method: 'POST',
    body: { employee: employee.data._id, amount: 100, note: 'Monthly' },
  });
  if (!salary.success) throw new Error(`Salary failed: ${salary.message}`);
  balance -= 100;
  await assertBalance(repo, balance, 'After salary');

  // 8. Person deposit
  const deposit = await repo.request({
    url: '/cashbox-person-accounts/transaction',
    method: 'POST',
    body: { personName: 'Owner', transactionType: 'DEPOSIT', amount: 200, reason: 'Capital' },
  });
  if (!deposit.success) throw new Error(`Deposit failed: ${deposit.message}`);
  balance += 200;
  await assertBalance(repo, balance, 'After deposit');

  // 9. Person withdrawal
  const withdraw = await repo.request({
    url: '/cashbox-person-accounts/transaction',
    method: 'POST',
    body: { personName: 'Owner', transactionType: 'WITHDRAWAL', amount: 50, reason: 'Petty cash' },
  });
  if (!withdraw.success) throw new Error(`Withdrawal failed: ${withdraw.message}`);
  balance -= 50;
  await assertBalance(repo, balance, 'After withdrawal');

  const summary = await repo.request({ url: '/cashbox-transactions/summary', method: 'GET' });
  const allTx = await repo.request({ url: '/cashbox-transactions', method: 'GET', params: { limit: 100 } });
  const types = new Set(allTx.data.map((row) => row.transactionType));
  const required = ['SALE_INCOME', 'DEBT_PAYMENT', 'PURCHASE_PAYMENT', 'COMPANY_DEBT_PAYMENT', 'EXPENSE', 'SALARY_PAYMENT', 'PERSON_DEPOSIT', 'PERSON_WITHDRAWAL'];
  required.forEach((type) => {
    if (!types.has(type)) throw new Error(`Missing transaction type: ${type}`);
  });

  if (summary.data.todaySalesIncome < 40) throw new Error('todaySalesIncome not populated');
  if (allTx.data.some((row) => row.balanceBefore === undefined || row.balanceAfter === undefined)) {
    throw new Error('Transactions missing balanceBefore/balanceAfter');
  }

  console.log('ALL OFFLINE CASHBOX INTEGRATION TESTS PASSED');
  console.log('Final balance:', balance);
  console.log('Transaction types:', [...types].join(', '));
  fs.rmSync(tempDir, { recursive: true, force: true });
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
