const path = require('path');
const os = require('os');
const fs = require('fs');

const { LocalRepository } = require('../electron/localRepository');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pharmacy-cashbox-i18n-'));
const repo = new LocalRepository(tempDir);

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const runLanguage = async (language, expectedReason) => {
  const create = await repo.request({
    method: 'POST',
    url: '/cashbox-transactions',
    body: {
      direction: 'IN',
      amount: 100,
      transactionType: 'SALE_INCOME',
      language,
    },
  });
  assert(create.success, `create failed for ${language}`);
  const tx = create.data;
  assert(tx.reason === expectedReason, `${language} reason: expected "${expectedReason}", got "${tx.reason}"`);
  assert(tx.relatedCashboxReference === expectedReason, `${language} reference: expected "${expectedReason}", got "${tx.relatedCashboxReference}"`);
  assert(tx.notes && tx.notes.length > 0, `${language} notes should not be empty`);
  assert(!/^[a-z0-9_]{6,}$/i.test(tx.relatedCashboxReference), `${language} reference must not be raw ID`);
};

(async () => {
  await repo.init();
  await runLanguage('en', 'Medicine Sale');
  await runLanguage('fa', 'فروش دوا');
  await runLanguage('ps', 'د درمل پلور');
  console.log('ALL CASHBOX LABEL / I18N TESTS PASSED');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
