/**
 * Manual verification script for Customer Debtor Account system.
 * Run: npx ts-node src/modules/customerDebtorAccount/customerDebtorAccount.test.ts
 */
import mongoose from 'mongoose';
import CustomerDebtorAccount from './customerDebtorAccount.model';
import customerDebtorAccountServices from './customerDebtorAccount.services';

const TEST_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pharmacy_test_debtor';
const TEST_USER = new mongoose.Types.ObjectId();

async function run() {
  await mongoose.connect(TEST_URI);
  await CustomerDebtorAccount.deleteMany({ createdBy: TEST_USER });

  console.log('1. Create Ahmed with first debt...');
  const first = await customerDebtorAccountServices.addDebt(
    {
      customerName: 'Ahmed',
      date: new Date('2026-06-23'),
      amount: 3000,
      reason: 'Purchased 5 medicines and did not pay.',
      notes: 'First visit',
    },
    TEST_USER.toString(),
  );
  console.log('   Account:', first.customerName, 'Debt:', first.currentDebt, 'Entries:', first.debtEntries.length);

  console.log('2. Add second debt for ahmed (case-insensitive reuse)...');
  const second = await customerDebtorAccountServices.addDebt(
    {
      customerName: 'ahmed',
      date: new Date('2026-06-24'),
      amount: 1500,
      reason: 'Purchased 2 more medicines on credit.',
      notes: 'Second visit',
    },
    TEST_USER.toString(),
  );
  console.log('   Same account id:', first._id.toString() === second._id.toString());
  console.log('   Entries:', second.debtEntries.length, 'Total debt:', second.currentDebt);

  const active = await customerDebtorAccountServices.readAll({ status: 'active' }, TEST_USER.toString());
  console.log('3. Active accounts:', active.totalCount, '(expected 1)');

  const details = await customerDebtorAccountServices.read(second._id.toString(), TEST_USER.toString());
  console.log('4. Account details history rows:', details.debtEntries.length, '(expected 2)');

  console.log('5. Settle account...');
  const settled = await customerDebtorAccountServices.settle(second._id.toString(), TEST_USER.toString());
  console.log('   Status:', settled.status, 'Settlement total:', settled.settlementTotalDebt);

  const activeAfter = await customerDebtorAccountServices.readAll({ status: 'active' }, TEST_USER.toString());
  const settledList = await customerDebtorAccountServices.readAll({ status: 'settled' }, TEST_USER.toString());
  console.log('6. Active after settle:', activeAfter.totalCount, '(expected 0)');
  console.log('7. Settlement history:', settledList.totalCount, '(expected 1)');
  console.log('   Reason summary:', settledList.data[0]?.settlementReasonSummary);

  await CustomerDebtorAccount.deleteMany({ createdBy: TEST_USER });
  await mongoose.disconnect();

  const passed =
    first._id.toString() === second._id.toString() &&
    second.debtEntries.length === 2 &&
    active.totalCount === 1 &&
    settled.status === 'SETTLED' &&
    activeAfter.totalCount === 0 &&
    settledList.totalCount === 1;

  console.log(passed ? '\nALL TESTS PASSED' : '\nTESTS FAILED');
  process.exit(passed ? 0 : 1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
