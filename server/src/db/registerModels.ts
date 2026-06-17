/**
 * Side-effect imports register all Mongoose models and their indexes.
 * Import this once after MongoDB connects (see server.ts).
 */

// Existing modules
import '../modules/user/user.model';
import '../modules/product/product.model';
import '../modules/sale/sale.model';
import '../modules/purchase/purchase.model';
import '../modules/seller/seller.model';
import '../modules/expense/expense.model';

// Financial & pharmacy extensions
import '../modules/customer/customer.model';
import '../modules/customerDebtorAccount/customerDebtorAccount.model';
import '../modules/customerPayment/customerPayment.model';
import '../modules/customerLedger/customerLedger.model';
import '../modules/sellerPayment/sellerPayment.model';
import '../modules/sellerLedger/sellerLedger.model';
import '../modules/cashboxTransaction/cashboxTransaction.model';
import '../modules/cashboxPersonAccount/cashboxPersonAccount.model';
import '../modules/moneyTransfer/moneyTransfer.model';
import '../modules/saleReturn/saleReturn.model';
import '../modules/prescription/prescription.model';
import '../modules/employee/employee.model';
import '../modules/salaryPayment/salaryPayment.model';
import '../modules/activityLog/activityLog.model';
import '../modules/backupLog/backupLog.model';

export {};
