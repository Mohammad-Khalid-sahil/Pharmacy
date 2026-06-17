'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { LocalRepository } = require('../electron/localRepository');
const { login } = require('../electron/staticAuth');

const DEMO_SEED_SOURCES = [
  'localRepository.seedDefaults() — was inserting seller_default / Default Supplier (disabled)',
];

const collectionsToClear = [
  'products',
  'sales',
  'purchases',
  'expenses',
  'customers',
  'customer-debtor-accounts',
  'cashbox-transactions',
  'cashbox-person-accounts',
  'alerts',
  'alert-dismissals',
  'prescriptions',
  'salary-payments',
  'sale-returns',
  'customer-payments',
  'customer-ledgers',
  'seller-ledgers',
  'seller-payments',
  'money-transfers',
  'sellers',
  'employees',
  'backups',
];

const verificationCollections = [
  'products',
  'sales',
  'purchases',
  'expenses',
  'customers',
  'customer-debtor-accounts',
  'cashbox-transactions',
  'cashbox-person-accounts',
  'alerts',
  'prescriptions',
  'sellers',
];

function countAll(db) {
  const counts = {};
  collectionsToClear.forEach((name) => {
    counts[name] = (db[name] || []).length;
  });
  return counts;
}

async function run() {
  const userData = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'pharmacy-reset-'));
  const repo = new LocalRepository(userData);
  await repo.init();

  const beforeCounts = countAll(await repo.readDb());

  const db = await repo.readDb();
  collectionsToClear.forEach((name) => {
    db[name] = [];
  });
  await repo.persistCollections(db, collectionsToClear);

  const afterCounts = countAll(await repo.readDb());
  const clearedOk = collectionsToClear.every((name) => afterCounts[name] === 0);

  const restart = new LocalRepository(userData);
  await restart.init();
  const afterRestartCounts = countAll(await restart.readDb());
  const noReseedOk = collectionsToClear.every((name) => afterRestartCounts[name] === 0);
  const verificationOk = verificationCollections.every((name) => afterRestartCounts[name] === 0);

  const authOk = login('admin@pharmacy.local', 'Admin12345').success;

  console.log('PRODUCTION DATABASE CLEANUP REPORT');
  console.log('userData:', userData);
  console.log('demo seed sources found:', DEMO_SEED_SOURCES.join(' | '));
  console.log('collections inspected:', collectionsToClear.join(', '));
  console.log('records before cleanup:', JSON.stringify(beforeCounts));
  console.log('records after cleanup:', JSON.stringify(afterCounts));
  console.log('records after restart (no reseed):', JSON.stringify(afterRestartCounts));
  console.log('verification (operational zero):', verificationOk);
  console.log('auth login ok:', authOk);
  console.log('no demo reseed on restart:', noReseedOk);

  verificationCollections.forEach((name) => {
    console.log(`  ${name}: ${afterRestartCounts[name]} records`);
  });

  const passed = clearedOk && noReseedOk && verificationOk && authOk;
  console.log(passed ? 'PRODUCTION DATABASE CLEANUP PASSED' : 'PRODUCTION DATABASE CLEANUP FAILED');

  if (!process.argv[2]) {
    fs.rmSync(userData, { recursive: true, force: true });
  }

  process.exit(passed ? 0 : 1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
