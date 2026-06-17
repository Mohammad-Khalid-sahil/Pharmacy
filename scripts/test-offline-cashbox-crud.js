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
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pharmacy-cashbox-crud-'));
  const repo = new LocalRepository(tempDir);
  await repo.init();

  let balance = 0;

  const created = await repo.request({
    url: '/cashbox-transactions',
    method: 'POST',
    body: {
      transactionType: 'DEPOSIT',
      direction: 'IN',
      amount: 100,
      reason: 'Opening float',
      notes: 'Start of day',
      reference: 'REF-001',
      date: '2026-06-08',
      time: '09:30',
    },
  });
  if (!created.success) throw new Error(`Create failed: ${created.message}`);
  balance += 100;
  await assertBalance(repo, balance, 'After create deposit');

  const txId = created.data._id;
  const listed = await repo.request({
    url: '/cashbox-transactions',
    method: 'GET',
    params: { search: 'Opening float', limit: 10 },
  });
  if (!listed.success || !listed.data.some((row) => row._id === txId)) {
    throw new Error('Search did not return created transaction');
  }

  const updated = await repo.request({
    url: `/cashbox-transactions/${txId}`,
    method: 'PATCH',
    body: { amount: 150, reason: 'Adjusted float', notes: 'Corrected amount', reference: 'REF-001A' },
  });
  if (!updated.success) throw new Error(`Update failed: ${updated.message}`);
  balance = 150;
  await assertBalance(repo, balance, 'After update amount');

  const detail = await repo.request({ url: `/cashbox-transactions/${txId}`, method: 'GET' });
  if (!detail.success || Number(detail.data.amount) !== 150) throw new Error('Updated amount not persisted');
  if (detail.data.reason !== 'Adjusted float') throw new Error('Updated reason not persisted');
  if (detail.data.referenceId !== 'REF-001A') throw new Error('Updated reference not persisted');

  const withdrawal = await repo.request({
    url: '/cashbox-transactions',
    method: 'POST',
    body: {
      transactionType: 'WITHDRAWAL',
      direction: 'OUT',
      amount: 50,
      reason: 'Petty cash',
      reference: 'REF-002',
    },
  });
  if (!withdrawal.success) throw new Error(`Withdrawal create failed: ${withdrawal.message}`);
  balance -= 50;
  await assertBalance(repo, balance, 'After withdrawal create');

  const deleted = await repo.request({
    url: `/cashbox-transactions/${withdrawal.data._id}`,
    method: 'DELETE',
  });
  if (!deleted.success) throw new Error(`Delete failed: ${deleted.message}`);
  balance += 50;
  await assertBalance(repo, balance, 'After delete withdrawal');

  const allTx = await repo.request({ url: '/cashbox-transactions', method: 'GET', params: { limit: 20 } });
  if (allTx.data.some((row) => row._id === withdrawal.data._id)) {
    throw new Error('Deleted transaction still appears in list');
  }
  if (allTx.data.some((row) => row.balanceBefore === undefined || row.balanceAfter === undefined)) {
    throw new Error('Transactions missing balance snapshots after CRUD');
  }

  const personDeposit = await repo.request({
    url: '/cashbox-person-accounts/transaction',
    method: 'POST',
    body: { personName: 'Owner', transactionType: 'DEPOSIT', amount: 25, reason: 'Person only' },
  });
  if (!personDeposit.success) throw new Error(`Person account deposit failed: ${personDeposit.message}`);
  balance += 25;
  await assertBalance(repo, balance, 'After person account deposit (untouched flow)');

  console.log('ALL OFFLINE CASHBOX CRUD TESTS PASSED');
  console.log('Final balance:', balance);
  fs.rmSync(tempDir, { recursive: true, force: true });
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
