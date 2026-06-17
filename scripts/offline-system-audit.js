'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { LocalRepository } = require('../electron/localRepository');

const testRoot = path.join(process.cwd(), '.tmp-offline-system-audit');

async function ok(result, label) {
  assert(result.success, `${label}: ${result.message || 'request failed'}`);
  return result.data;
}

async function main() {
  fs.rmSync(testRoot, { recursive: true, force: true });

  const repo = new LocalRepository(testRoot);
  await repo.init();

  await ok(
    await repo.request({
      url: '/auth/login',
      method: 'POST',
      body: { email: 'admin@pharmacy.local', password: 'Admin12345' },
    }),
    'login',
  );

  const abcCompany = await ok(
    await repo.request({
      url: '/sellers',
      method: 'POST',
      body: { name: 'ABC Pharma', email: 'abc.pharma@example.local', contactNo: '700000001' },
    }),
    'mandatory purchase test: create ABC Pharma',
  );

  const panadol = await ok(
    await repo.request({
      url: '/products',
      method: 'POST',
      body: {
        name: 'Panadol',
        barcode: 'ABC-PANADOL-001',
        price: 10,
        salePrice: 10,
        purchasePrice: 5,
        stock: 0,
        minStock: 10,
        seller: abcCompany._id,
      },
    }),
    'mandatory purchase test: create Panadol',
  );

  const panadolPurchase = await ok(
    await repo.request({
      url: '/purchases',
      method: 'POST',
      body: {
        seller: abcCompany._id,
        product: panadol._id,
        quantity: 100,
        unitPrice: 5,
        paid: 200,
        invoiceNumber: 'ABC-INV-100',
        actor: 'Audit Admin',
      },
    }),
    'mandatory purchase test: purchase Panadol',
  );
  assert.strictEqual(panadolPurchase.productName, 'Panadol', 'purchase did not keep medicine link');
  assert.strictEqual(panadolPurchase.sellerName, 'ABC Pharma', 'purchase did not keep company link');
  assert.strictEqual(panadolPurchase.paymentStatus, 'PARTIAL', 'purchase payment status not normalized');

  let mandatoryProducts = await ok(await repo.request({ url: '/products', method: 'GET', params: { search: 'Panadol', limit: 20 } }), 'mandatory purchase test: medicine inventory');
  let mandatoryPanadol = mandatoryProducts.find((item) => item._id === panadol._id);
  assert.strictEqual(mandatoryPanadol.stock, 100, 'mandatory purchase test: medicine stock did not increase to 100');

  const mandatoryPurchases = await ok(await repo.request({ url: '/purchases', method: 'GET', params: { search: 'Panadol', limit: 20 } }), 'mandatory purchase test: purchase list');
  assert(mandatoryPurchases.some((purchase) => purchase._id === panadolPurchase._id), 'mandatory purchase test: purchase not visible in purchases page data');

  const mandatorySellerBalance = await ok(await repo.request(`/seller-ledgers/balance/${abcCompany._id}`), 'mandatory purchase test: company account');
  assert.strictEqual(mandatorySellerBalance.purchases, 500, 'mandatory purchase test: company total purchases not updated');
  assert.strictEqual(mandatorySellerBalance.payments, 200, 'mandatory purchase test: company payments not updated');
  assert.strictEqual(mandatorySellerBalance.balance, 300, 'mandatory purchase test: company remaining balance not updated');

  const mandatoryCashbox = await ok(await repo.request('/cashbox-transactions/summary'), 'mandatory purchase test: cashbox');
  assert.strictEqual(mandatoryCashbox.cashOut, 200, 'mandatory purchase test: cashbox did not record paid purchase amount');

  const mandatoryDashboard = await ok(await repo.request('/products/total'), 'mandatory purchase test: dashboard inventory');
  assert.strictEqual(mandatoryDashboard.totalQuantity, 100, 'mandatory purchase test: dashboard stock total not updated');

  const mandatoryLowStock = await ok(await repo.request('/products/alerts/low-stock'), 'mandatory purchase test: alerts');
  assert(!mandatoryLowStock.some((item) => item._id === panadol._id), 'mandatory purchase test: alerts did not refresh after stock increase');

  const purchaseUpdated = await ok(
    await repo.request({
      url: `/purchases/${panadolPurchase._id}`,
      method: 'PATCH',
      body: { quantity: 120, unitPrice: 5, paid: 600, seller: abcCompany._id, product: panadol._id, actor: 'Audit Admin' },
    }),
    'mandatory purchase test: update purchase relationship',
  );
  assert.strictEqual(purchaseUpdated.paymentStatus, 'PAID', 'purchase update did not normalize payment status');
  mandatoryProducts = await ok(await repo.request({ url: '/products', method: 'GET', params: { search: 'Panadol', limit: 20 } }), 'mandatory purchase test: inventory after update');
  mandatoryPanadol = mandatoryProducts.find((item) => item._id === panadol._id);
  assert.strictEqual(mandatoryPanadol.stock, 120, 'purchase update did not reconcile inventory delta');
  const updatedSellerBalance = await ok(await repo.request(`/seller-ledgers/balance/${abcCompany._id}`), 'mandatory purchase test: company account after update');
  assert.strictEqual(updatedSellerBalance.balance, 0, 'purchase update did not rebuild company balance');
  const updatedCashboxRows = await ok(await repo.request({ url: '/cashbox-transactions', method: 'GET', params: { limit: 20 } }), 'mandatory purchase test: cashbox history after update');
  assert.strictEqual(updatedCashboxRows.filter((row) => row.purchase === panadolPurchase._id).length, 1, 'purchase update did not rebuild cashbox purchase row');

  const mandatoryRestartedRepo = new LocalRepository(testRoot);
  await mandatoryRestartedRepo.init();
  const persistedPanadolRows = await ok(await mandatoryRestartedRepo.request({ url: '/products', method: 'GET', params: { search: 'Panadol', limit: 20 } }), 'mandatory purchase test: restart persistence');
  assert(persistedPanadolRows.some((item) => item._id === panadol._id && item.stock === 120), 'mandatory purchase test: restart did not persist purchased stock');

  const company = await ok(
    await repo.request({
      url: '/sellers',
      method: 'POST',
      body: { name: 'Audit Pharma Co', email: 'audit@example.local', contactNo: '123456789' },
    }),
    'create company',
  );

  const blockedCategory = await repo.request({ url: '/categories', method: 'POST', body: { name: 'Blocked Category' } });
  assert(!blockedCategory.success, 'category recreation should be disabled');
  const blockedBrand = await repo.request({ url: '/brands', method: 'POST', body: { name: 'Blocked Brand' } });
  assert(!blockedBrand.success, 'brand recreation should be disabled');

  const medicine = await ok(
    await repo.request({
      url: '/products',
      method: 'POST',
      body: {
        name: 'Audit Aspirin',
        price: 10,
        salePrice: 10,
        purchasePrice: 4,
        stock: 2,
        minStock: 10,
        seller: company._id,
        expireDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      },
    }),
    'add medicine',
  );

  const productList = await ok(
    await repo.request({
      url: '/products',
      method: 'GET',
      params: { name: 'aspirin', minPrice: 0, maxPrice: 20000, limit: 10 },
    }),
    'medicine list with UI filters',
  );
  assert(productList.some((product) => product._id === medicine._id), 'medicine list did not include newly added medicine');

  await ok(
    await repo.request({
      url: `/products/${medicine._id}/add`,
      method: 'PATCH',
      body: { stock: 85, seller: company._id, purchasePrice: 4, paid: 8, actor: 'Ahmad' },
    }),
    'purchase stock through add-stock',
  );

  let products = await ok(await repo.request({ url: '/products', method: 'GET', params: { limit: 20 } }), 'list products after purchase');
  let product = products.find((item) => item._id === medicine._id);
  assert.strictEqual(product.stock, 87, 'purchase did not increase inventory');

  const purchases = await ok(await repo.request({ url: '/purchases', method: 'GET', params: { limit: 20 } }), 'purchase list');
  assert(purchases.some((purchase) => purchase.product === medicine._id), 'purchase list did not persist stock purchase');

  await ok(
    await repo.request({
      url: '/purchases',
      method: 'POST',
      body: {
        product: medicine._id,
        seller: company._id,
        quantity: 3,
        unitPrice: 4,
        paid: 0,
        invoiceNumber: 'AUDIT-INV-001',
      },
    }),
    'purchase medicine through purchase panel route',
  );
  products = await ok(await repo.request({ url: '/products', method: 'GET', params: { limit: 20 } }), 'list products after purchase panel');
  product = products.find((item) => item._id === medicine._id);
  assert.strictEqual(product.stock, 90, 'purchase panel route did not increase stock');

  const customer = await ok(
    await repo.request({ url: '/customers', method: 'POST', body: { name: 'Audit Customer', phone: '555-1000' } }),
    'create customer',
  );

  const sales = await ok(
    await repo.request({
      url: '/sales/bulk',
      method: 'POST',
      body: {
        items: [{ product: medicine._id, quantity: 85, productPrice: 10 }],
        buyerName: 'Audit Buyer',
        date: new Date().toISOString().slice(0, 10),
        paymentType: 'PARTIAL',
        customer: customer._id,
        paidAmount: 800,
      },
    }),
    'sell medicine',
  );
  assert.strictEqual(sales.length, 1, 'bulk sale did not create sale rows');

  products = await ok(await repo.request({ url: '/products', method: 'GET', params: { limit: 20 } }), 'list products after sale');
  product = products.find((item) => item._id === medicine._id);
  assert.strictEqual(product.stock, 5, 'sale did not decrease inventory from 90 to 5');

  const saleHistory = await ok(await repo.request({ url: '/sales', method: 'GET', params: { limit: 20 } }), 'sales history');
  assert(saleHistory.some((sale) => sale.productName === 'Audit Aspirin'), 'sales history missing sale');

  const daily = await ok(await repo.request('/sales/days'), 'daily report');
  assert(daily.some((row) => row.totalRevenue === 850 && row.totalQuantity === 85), 'sales report did not include sale');

  const productTotals = await ok(await repo.request('/products/total'), 'dashboard inventory total');
  assert.strictEqual(productTotals.totalQuantity, 125, 'dashboard product total is not synchronized');

  const cashbox = await ok(await repo.request('/cashbox-transactions/summary'), 'cashbox summary');
  assert.strictEqual(cashbox.cashIn, 800, 'cashbox did not receive sale payment');
  assert.strictEqual(cashbox.cashOut, 608, 'cashbox did not receive purchase payment');

  const customerBalance = await ok(await repo.request(`/customers/${customer._id}/balance`), 'customer balance');
  assert.strictEqual(customerBalance.balance, 50, 'customer ledger did not receive sale due');

  const sellerBalance = await ok(await repo.request(`/seller-ledgers/balance/${company._id}`), 'seller balance');
  assert.strictEqual(sellerBalance.balance, 344, 'seller ledger did not reflect purchase and payment');

  const saleReturn = await ok(
    await repo.request({
      url: '/sale-returns',
      method: 'POST',
      body: { sale: sales[0]._id, quantity: 2, amount: 20, reason: 'Audit return', actor: 'Ahmad' },
    }),
    'return medicine',
  );
  assert.strictEqual(saleReturn.productName, 'Audit Aspirin', 'return history did not store medicine name');
  products = await ok(await repo.request({ url: '/products', method: 'GET', params: { limit: 20 } }), 'list products after return');
  product = products.find((item) => item._id === medicine._id);
  assert.strictEqual(product.stock, 7, 'return did not increase inventory');

  await ok(
    await repo.request({ url: '/customer-payments', method: 'POST', body: { customer: customer._id, amount: 25, actor: 'Ahmad' } }),
    'pay customer debt',
  );
  await ok(
    await repo.request({ url: '/customer-payments', method: 'POST', body: { customer: customer._id, amount: '۱۲۳۴', actor: 'Ahmad' } }),
    'pay customer debt with Dari numerals',
  );
  await ok(
    await repo.request({ url: '/customer-payments', method: 'POST', body: { customer: customer._id, amount: '۵۰۰', actor: 'Ahmad' } }),
    'pay customer debt with localized Persian/Pashto numerals',
  );
  const paidCustomerBalance = await ok(await repo.request(`/customers/${customer._id}/balance`), 'customer balance after payment');
  assert.strictEqual(paidCustomerBalance.balance, -1709, 'customer payment did not normalize localized numerals and reduce debt');

  const lowStock = await ok(await repo.request('/products/alerts/low-stock'), 'low stock alerts');
  assert(lowStock.some((item) => item._id === medicine._id), 'low stock alert did not trigger');
  const expiring = await ok(await repo.request('/products/alerts/expiring'), 'expiration alerts');
  assert(expiring.some((item) => item._id === medicine._id), 'expiration alert did not trigger');

  const manualCash = await ok(
    await repo.request({
      url: '/cashbox-transactions',
      method: 'POST',
      body: { type: 'WITHDRAWAL', direction: 'OUT', amount: 10, actor: 'Ahmad', description: 'Owner draw' },
    }),
    'manual cashbox transaction',
  );
  assert.strictEqual(manualCash.actor, 'Ahmad', 'cashbox transaction actor was not stored');

  await ok(
    await repo.request({ url: '/money-transfers', method: 'POST', body: { amount: 15, toAccountOrPlace: 'Audit Bank', actor: 'Ahmad' } }),
    'transfer cash',
  );
  const transfers = await ok(await repo.request({ url: '/money-transfers', method: 'GET', params: { limit: 20 } }), 'transfer history');
  assert(transfers.some((row) => row.toAccountOrPlace === 'Audit Bank'), 'transfer history missing transfer');

  await ok(
    await repo.request({ url: '/expenses', method: 'POST', body: { category: 'Rent', title: 'Audit Rent', amount: 35, actor: 'Ahmad' } }),
    'add expense',
  );
  const expenses = await ok(await repo.request({ url: '/expenses', method: 'GET', params: { limit: 20 } }), 'expense history');
  assert(expenses.some((row) => row.title === 'Audit Rent'), 'expense history missing expense');

  await ok(
    await repo.request({
      url: '/employees',
      method: 'POST',
      body: { name: 'Audit Employee', salary: 100, position: 'Cashier', status: 'ACTIVE' },
    }),
    'create employee',
  );
  const employees = await ok(await repo.request({ url: '/employees', method: 'GET', params: { limit: 20 } }), 'employee list');
  const employee = employees.find((row) => row.name === 'Audit Employee');
  assert(employee, 'employee list did not include created employee');
  await ok(
    await repo.request({ url: '/salary-payments', method: 'POST', body: { employee: employee._id, amount: 75, actor: 'Ahmad' } }),
    'salary payment',
  );
  const salaries = await ok(await repo.request({ url: '/salary-payments', method: 'GET', params: { limit: 20 } }), 'salary payment list');
  assert(salaries.some((row) => row.employee === employee._id && row.employeeName === 'Audit Employee'), 'salary payment did not link employee');

  await ok(
    await repo.request({
      url: '/prescriptions',
      method: 'POST',
      body: { sale: sales[0]._id, customer: customer._id, patientName: 'Audit Patient', items: [{ product: medicine._id, quantity: 1 }] },
    }),
    'create prescription',
  );
  const prescriptions = await ok(await repo.request({ url: '/prescriptions', method: 'GET', params: { limit: 20 } }), 'prescription list');
  assert(prescriptions.some((prescription) => prescription.patientName === 'Audit Patient'), 'prescription list did not include created prescription');

  const backup = await ok(await repo.request({ url: '/backups', method: 'POST' }), 'create backup');
  const downloadedBackup = await ok(await repo.request({ url: `/backups/${backup._id}/download`, method: 'GET' }), 'download backup');
  assert(downloadedBackup.payload.includes('Audit Aspirin'), 'downloaded backup did not include pharmacy data');
  const blockedImport = await repo.request({ url: '/backups/import', method: 'POST', body: { payload: downloadedBackup.payload } });
  assert(!blockedImport.success && blockedImport.statusCode === 404, 'backup import route should be removed');
  await ok(await repo.request({ url: `/backups/${backup._id}/restore`, method: 'POST' }), 'restore backup');

  const restartedRepo = new LocalRepository(testRoot);
  await restartedRepo.init();
  const persistedProducts = await ok(await restartedRepo.request({ url: '/products', method: 'GET', params: { limit: 20 } }), 'restart product persistence');
  assert(persistedProducts.some((item) => item._id === medicine._id && item.stock === 7), 'restart did not preserve product inventory');
  const persistedSales = await ok(await restartedRepo.request({ url: '/sales', method: 'GET', params: { limit: 20 } }), 'restart sales persistence');
  assert(persistedSales.some((sale) => sale._id === sales[0]._id), 'restart did not preserve sales');

  fs.rmSync(testRoot, { recursive: true, force: true });
  console.log('Offline system audit passed');
}

main().catch((error) => {
  try {
    fs.rmSync(testRoot, { recursive: true, force: true });
  } catch {
    // ignore cleanup failure
  }
  console.error(error);
  process.exit(1);
});
