'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { LocalRepository } = require('../electron/localRepository');

async function run() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pharmacy-empty-start-'));
  const repo = new LocalRepository(tempDir);
  await repo.init();

  const db = await repo.readDb();
  const checks = {
    products: db.products.length,
    sales: db.sales.length,
    purchases: db.purchases.length,
    expenses: db.expenses.length,
    customers: db.customers.length,
    customerDebtors: db['customer-debtor-accounts'].length,
    cashboxTransactions: db['cashbox-transactions'].length,
    personAccounts: db['cashbox-person-accounts'].length,
    alerts: db.alerts.length,
    prescriptions: db.prescriptions.length,
    sellers: db.sellers.length,
  };

  const passed = Object.values(checks).every((count) => count === 0);
  console.log('FRESH STARTUP COUNTS:', JSON.stringify(checks, null, 2));
  console.log(passed ? 'PRODUCTION EMPTY STARTUP PASSED' : 'PRODUCTION EMPTY STARTUP FAILED');

  fs.rmSync(tempDir, { recursive: true, force: true });
  process.exit(passed ? 0 : 1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
