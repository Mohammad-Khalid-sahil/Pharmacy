/**
 * Verification script for Cashbox Person Account system.
 * Run: npx ts-node src/modules/cashboxPersonAccount/cashboxPersonAccount.test.ts
 */
import mongoose from 'mongoose';
import CashboxPersonAccount from './cashboxPersonAccount.model';
import CashboxTransaction from '../cashboxTransaction/cashboxTransaction.model';
import cashboxPersonAccountServices from './cashboxPersonAccount.services';

const TEST_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pharmacy_test_person_account';
const TEST_USER = new mongoose.Types.ObjectId();

async function run() {
  await mongoose.connect(TEST_URI);
  await CashboxPersonAccount.deleteMany({ createdBy: TEST_USER });
  await CashboxTransaction.deleteMany({ createdBy: TEST_USER });

  console.log('1. Ahmed deposit 1000...');
  const first = await cashboxPersonAccountServices.addTransaction(
    { personName: 'Ahmed', transactionType: 'DEPOSIT', amount: 1000, reason: 'Initial deposit' },
    TEST_USER.toString(),
  );
  console.log('   Account:', first.account.personName, 'Balance:', first.account.currentNetBalance);

  console.log('2. Ahmed deposit 500...');
  const second = await cashboxPersonAccountServices.addTransaction(
    { personName: 'Ahmed', transactionType: 'DEPOSIT', amount: 500, reason: 'Second deposit' },
    TEST_USER.toString(),
  );
  console.log('   Same account:', first.account._id.toString() === second.account._id.toString());
  console.log('   Transactions:', second.account.transactions.length, 'Balance:', second.account.currentNetBalance);

  console.log('3. Ahmed withdraw 200...');
  const third = await cashboxPersonAccountServices.addTransaction(
    { personName: 'ahmed', transactionType: 'WITHDRAWAL', amount: 200, reason: 'Cash withdrawal' },
    TEST_USER.toString(),
  );
  console.log('   Transactions:', third.account.transactions.length, 'Balance:', third.account.currentNetBalance);

  console.log('4. Mahmood deposit 2000 (separate account)...');
  await cashboxPersonAccountServices.addTransaction(
    { personName: 'Mahmood', transactionType: 'DEPOSIT', amount: 2000, reason: 'Manager deposit' },
    TEST_USER.toString(),
  );

  const all = await cashboxPersonAccountServices.readAll({}, TEST_USER.toString());
  console.log('5. Total accounts:', all.totalCount, '(expected 2)');

  const ahmed = await cashboxPersonAccountServices.findByKey(TEST_USER.toString(), 'ahmed');
  console.log('6. Ahmed history rows:', ahmed?.transactions.length, '(expected 3)');
  console.log('7. Ahmed balance:', ahmed?.currentNetBalance, '(expected 1300)');

  const cashboxRows = await CashboxTransaction.countDocuments({ createdBy: TEST_USER, sourceModule: 'OPERATOR_ACCOUNT' });
  console.log('8. Cashbox ledger entries:', cashboxRows, '(expected 4)');

  await CashboxPersonAccount.deleteMany({ createdBy: TEST_USER });
  await CashboxTransaction.deleteMany({ createdBy: TEST_USER });
  await mongoose.disconnect();

  const passed =
    first.account._id.toString() === third.account._id.toString() &&
    third.account.transactions.length === 3 &&
    third.account.currentNetBalance === 1300 &&
    all.totalCount === 2 &&
    ahmed?.transactions.length === 3 &&
    cashboxRows === 4;

  console.log(passed ? '\nALL TESTS PASSED' : '\nTESTS FAILED');
  process.exit(passed ? 0 : 1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
