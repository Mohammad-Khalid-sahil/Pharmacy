'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { LocalRepository } = require('../electron/localRepository');

async function run() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pharmacy-offline-person-'));
  const repo = new LocalRepository(tempDir);
  await repo.init();

  console.log('1. POST deposit Ahmad 1000 (auto-create account)...');
  const first = await repo.request({
    url: '/cashbox-person-accounts/transaction',
    method: 'POST',
    body: {
      personName: 'Ahmad',
      transactionType: 'DEPOSIT',
      amount: 1000,
      reason: 'Initial deposit',
      notes: 'First deposit',
    },
  });
  if (!first.success) throw new Error(`Deposit failed: ${first.message}`);
  console.log('   OK balance:', first.data.currentNetBalance, 'account:', first.data._id);

  console.log('2. POST deposit Ahmad 500 (reuse same account)...');
  const second = await repo.request({
    url: '/cashbox-person-accounts/transaction',
    method: 'POST',
    body: {
      personName: 'Ahmad',
      transactionType: 'DEPOSIT',
      amount: 500,
      reason: 'Second deposit',
    },
  });
  if (!second.success) throw new Error(`Second deposit failed: ${second.message}`);
  const sameAccount = first.data._id === second.data._id;
  console.log('   Same account:', sameAccount, 'transactions:', second.data.transactions.length);

  console.log('3. POST withdraw ahmad 300 (reuse same account)...');
  const third = await repo.request({
    url: '/cashbox-person-accounts/transaction',
    method: 'POST',
    body: {
      personName: 'ahmad',
      transactionType: 'WITHDRAWAL',
      amount: 300,
      reason: 'Cash withdrawal',
    },
  });
  if (!third.success) throw new Error(`Withdraw failed: ${third.message}`);
  console.log('   Balance:', third.data.currentNetBalance, 'transactions:', third.data.transactions.length);

  console.log('4. POST withdraw new person Sara 200 (auto-create account)...');
  const sara = await repo.request({
    url: '/cashbox-person-accounts/transaction',
    method: 'POST',
    body: {
      personName: 'Sara',
      transactionType: 'WITHDRAWAL',
      amount: 200,
      reason: 'First withdrawal',
    },
  });
  if (!sara.success) throw new Error(`Sara auto-create failed: ${sara.message}`);
  console.log('   Sara account created:', sara.data._id, 'balance:', sara.data.currentNetBalance);

  console.log('5. GET account by id...');
  const detail = await repo.request({
    url: `/cashbox-person-accounts/${third.data._id}`,
    method: 'GET',
  });
  if (!detail.success) throw new Error(`Get failed: ${detail.message}`);

  console.log('6. GET list...');
  const list = await repo.request({
    url: '/cashbox-person-accounts',
    method: 'GET',
    params: { page: 1, limit: 10 },
  });
  if (!list.success) throw new Error(`List failed: ${list.message}`);

  console.log('7. Restart simulation (new repo instance, same data dir)...');
  const repo2 = new LocalRepository(tempDir);
  await repo2.init();
  const afterRestart = await repo2.request({
    url: '/cashbox-person-accounts',
    method: 'GET',
    params: { page: 1, limit: 10 },
  });
  if (!afterRestart.success) throw new Error(`Restart list failed: ${afterRestart.message}`);

  console.log('8. POST withdraw Ahmad 2000 (must succeed without balance restriction)...');
  const overWithdraw = await repo.request({
    url: '/cashbox-person-accounts/transaction',
    method: 'POST',
    body: {
      personName: 'Ahmad',
      transactionType: 'WITHDRAWAL',
      amount: 2000,
    },
  });
  if (!overWithdraw.success) throw new Error(`Over-withdraw failed: ${overWithdraw.message}`);

  const tx = detail.data.transactions;
  const ahmadAfterRestart = afterRestart.data.find((row) => row.personName.toLowerCase() === 'ahmad');
  const passed =
    sameAccount &&
    third.data._id === first.data._id &&
    third.data.transactions.length === 3 &&
    third.data.currentNetBalance === 1200 &&
    third.data.totalDeposited === 1500 &&
    third.data.totalWithdrawn === 300 &&
    list.meta.total === 2 &&
    afterRestart.data.length === 2 &&
    ahmadAfterRestart?.transactions.length === 3 &&
    sara.data.currentNetBalance === -200 &&
    overWithdraw.data.currentNetBalance === -800 &&
    overWithdraw.data.transactions.length === 4 &&
    tx.every((entry) => entry.personName === 'Ahmad') &&
    tx.some((entry) => entry.transactionType === 'DEPOSIT' && entry.amount === 1000) &&
    tx.some((entry) => entry.transactionType === 'WITHDRAWAL' && entry.amount === 300);

  console.log(passed ? '\nALL OFFLINE PERSON ACCOUNT TESTS PASSED' : '\nTESTS FAILED');
  fs.rmSync(tempDir, { recursive: true, force: true });
  process.exit(passed ? 0 : 1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
