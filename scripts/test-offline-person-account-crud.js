'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { LocalRepository } = require('../electron/localRepository');

async function run() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pharmacy-person-crud-'));
  const repo = new LocalRepository(tempDir);
  await repo.init();

  const create = await repo.request({
    url: '/cashbox-person-accounts/transaction',
    method: 'POST',
    body: { personName: 'Ahmad', transactionType: 'DEPOSIT', amount: 500, reason: 'Seed', notes: 'Initial' },
  });
  if (!create.success) throw new Error(`Create failed: ${create.message}`);
  const accountId = create.data._id;
  const txCountBefore = create.data.transactions.length;

  const update = await repo.request({
    url: `/cashbox-person-accounts/${accountId}`,
    method: 'PATCH',
    body: { personName: 'Ahmad Khan', notes: 'Updated notes', metadata: 'VIP' },
  });
  if (!update.success) throw new Error(`Update failed: ${update.message}`);
  if (update.data.personName !== 'Ahmad Khan') throw new Error('Name not updated');
  if (update.data.notes !== 'Updated notes') throw new Error('Notes not updated');
  if (update.data.transactions.length !== txCountBefore) throw new Error('Transaction history modified');

  const get = await repo.request({ url: `/cashbox-person-accounts/${accountId}`, method: 'GET' });
  if (!get.success) throw new Error(`Get failed: ${get.message}`);

  const del = await repo.request({ url: `/cashbox-person-accounts/${accountId}`, method: 'DELETE' });
  if (!del.success) throw new Error(`Delete failed: ${del.message}`);

  const list = await repo.request({ url: '/cashbox-person-accounts', method: 'GET' });
  if (list.data.some((row) => row._id === accountId)) throw new Error('Account still listed after delete');

  const cashbox = await repo.request({ url: '/cashbox-transactions', method: 'GET' });
  const linked = cashbox.data.find((row) => row.personName === 'Ahmad Khan');
  if (!linked) throw new Error('Cashbox financial record missing');
  if (linked.referenceId === accountId || linked.personAccountKey) throw new Error('Orphan account reference not cleared');

  console.log('ALL OFFLINE PERSON ACCOUNT CRUD TESTS PASSED');
  fs.rmSync(tempDir, { recursive: true, force: true });
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
