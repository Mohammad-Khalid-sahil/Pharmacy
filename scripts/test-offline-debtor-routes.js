'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { LocalRepository } = require('../electron/localRepository');

async function run() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pharmacy-offline-debtor-'));
  const repo = new LocalRepository(tempDir);
  await repo.init();

  console.log('1. POST customer-debtor-accounts/debt (Ahmed)...');
  const create = await repo.request({
    url: '/customer-debtor-accounts/debt',
    method: 'POST',
    body: {
      customerName: 'Ahmed',
      date: '2026-06-23T00:00:00.000Z',
      amount: 3000,
      reason: 'Purchased 5 medicines and did not pay.',
      notes: 'First debt',
    },
  });
  if (!create.success) throw new Error(`Create failed: ${create.message}`);
  console.log('   OK:', create.message, 'balance', create.data.currentDebt);

  console.log('2. POST second debt (ahmed)...');
  const append = await repo.request({
    url: '/customer-debtor-accounts/debt',
    method: 'POST',
    body: {
      customerName: 'ahmed',
      date: '2026-06-24T00:00:00.000Z',
      amount: 1500,
      reason: 'Second purchase on credit.',
    },
  });
  if (!append.success) throw new Error(`Append failed: ${append.message}`);
  const sameAccount = create.data._id === append.data._id;
  console.log('   Same account:', sameAccount, 'entries:', append.data.debtEntries.length);

  console.log('3. GET customer-debtor-accounts (active)...');
  const list = await repo.request({
    url: '/customer-debtor-accounts',
    method: 'GET',
    params: { status: 'active', page: 1, limit: 10 },
  });
  if (!list.success) throw new Error(`List failed: ${list.message}`);
  console.log('   Active accounts:', list.meta.total);

  console.log('4. PATCH update notes...');
  const updated = await repo.request({
    url: `/customer-debtor-accounts/${append.data._id}`,
    method: 'PATCH',
    body: { accountNotes: 'Updated offline note' },
  });
  if (!updated.success) throw new Error(`Update failed: ${updated.message}`);

  console.log('5. POST settle...');
  const settled = await repo.request({
    url: `/customer-debtor-accounts/${append.data._id}/settle`,
    method: 'POST',
  });
  if (!settled.success) throw new Error(`Settle failed: ${settled.message}`);
  console.log('   Status:', settled.data.status);

  console.log('6. GET settled history...');
  const settledList = await repo.request({
    url: '/customer-debtor-accounts',
    method: 'GET',
    params: { status: 'settled', page: 1, limit: 10 },
  });
  console.log('   Settled accounts:', settledList.meta.total);

  console.log('7. DELETE settled account...');
  const deleted = await repo.request({
    url: `/customer-debtor-accounts/${append.data._id}`,
    method: 'DELETE',
  });
  if (!deleted.success) throw new Error(`Delete failed: ${deleted.message}`);

  const passed =
    create.success &&
    append.success &&
    sameAccount &&
    append.data.debtEntries.length === 2 &&
    list.meta.total === 1 &&
    settled.success &&
    settledList.meta.total === 1 &&
    deleted.success;

  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log(passed ? '\nALL OFFLINE DEBTOR TESTS PASSED' : '\nTESTS FAILED');
  process.exit(passed ? 0 : 1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
