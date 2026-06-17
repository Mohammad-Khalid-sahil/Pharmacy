'use strict';

const path = require('path');
const fs = require('fs');
const Datastore = require('@seald-io/nedb');
const log = require('electron-log');

const collectionNames = [
  'products',
  'sellers',
  'purchases',
  'expenses',
  'customers',
  'customer-payments',
  'customer-ledgers',
  'employees',
  'salary-payments',
  'prescriptions',
  'sales',
  'sale-returns',
  'cashbox-transactions',
  'money-transfers',
  'alerts',
  'alert-dismissals',
  'seller-ledgers',
  'seller-payments',
  'customer-debtor-accounts',
  'cashbox-person-accounts',
  'backups',
];

const nowIso = () => new Date().toISOString();
const todayIso = () => new Date().toISOString().slice(0, 10);
const parseCalendarDate = (value) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value || 0);
};
const calendarDateKey = (value, timeZone) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = value instanceof Date ? value : new Date(value || 0);
  if (Number.isNaN(parsed.getTime())) return '';
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(parsed);
      const get = (type) => parts.find((part) => part.type === type)?.value || '';
      return `${get('year')}-${get('month')}-${get('day')}`;
    } catch {
      /* fall back to local calendar date */
    }
  }
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
};
const normalizeExpenseDate = (value, timeZone) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const key = calendarDateKey(value || new Date(), timeZone);
  return key || calendarDateKey(new Date(), timeZone);
};
const addCalendarDays = (dateKey, days) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
const makeId = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const normalizeAccountKey = (name) => String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
const normalizeNumberString = (value) => {
  if (value === undefined || value === null) return '';
  return String(value)
    .trim()
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= 0x06f0 && code <= 0x06f9) return String(code - 0x06f0);
      if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
      return char;
    })
    .join('')
    .replace(/[\u066c,]/g, '')
    .replace(/\u066b/g, '.')
    .trim();
};
const toNumber = (value) => {
  const normalized = normalizeNumberString(value);
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};
const asArray = (value) => (Array.isArray(value) ? value : []);
const idOf = (value) => (value && typeof value === 'object' ? value._id : value);
const dismissedAlertKeys = (db) => new Set(asArray(db['alert-dismissals']).map((item) => item.alertKey));
const stripRemovedMedicineFields = (item) => {
  delete item.batchNo;
  delete item.manufacturer;
  delete item.size;
  delete item.brand;
  delete item.category;
  return item;
};

function response(data, statusCode = 200, message = 'Success', meta) {
  return {
    statusCode,
    success: statusCode < 400,
    message,
    data,
    ...(meta ? { meta } : {}),
  };
}

class LocalRepository {
  constructor(userDataPath) {
    log.info('LocalRepository constructor started', { userData: userDataPath });
    log.info('userData:', userDataPath);
    this.dbDir = path.join(userDataPath, 'embedded-db');
    log.info('dbDir:', this.dbDir);
    log.info('dbDir exists before mkdir:', fs.existsSync(this.dbDir));
    this.initialized = false;
    this.initPromise = null;
    fs.mkdirSync(this.dbDir, { recursive: true });
    log.info('dbDir exists after mkdir:', fs.existsSync(this.dbDir));
    this.collections = Object.fromEntries(collectionNames.map((name) => [
      name,
      new Datastore({
        filename: path.join(this.dbDir, `${name}.db`),
        autoload: false,
        timestampData: true,
      }),
    ]));
  }

  async init() {
    log.info('LocalRepository init started');
    if (this.initialized) return;
    if (!this.initPromise) {
      this.initPromise = (async () => {
        await Promise.all(collectionNames.map((name) => this.collections[name].loadDatabaseAsync()));
        await Promise.all(collectionNames.map((name) => this.collections[name].ensureIndexAsync({ fieldName: '_id', unique: true, sparse: true })));
        await this.seedDefaults();
        await this.reconcileSellerPaymentAllocations();
        this.initialized = true;
      })();
    }
    try {
      await this.initPromise;
      log.info('Database initialized:', this.initialized);
    } catch (error) {
      this.initPromise = null;
      this.initialized = false;
      log.error('LocalRepository init failed', error);
      throw error;
    }
  }

  async seedDefaults() {
    // Production: do not insert demo/sample records on startup or restore.
  }

  async insertDefault(collection, item) {
    const exists = await this.collections[collection].findOneAsync({ _id: item._id });
    if (!exists) {
      await this.collections[collection].insertAsync({ ...item, createdAt: nowIso(), updatedAt: nowIso() });
    }
  }

  async readDb() {
    const entries = await Promise.all(collectionNames.map(async (name) => [name, await this.collections[name].findAsync({})]));
    return Object.fromEntries(entries);
  }

  async replaceCollection(name, rows) {
    await this.collections[name].removeAsync({}, { multi: true });
    if (rows.length) {
      await this.collections[name].insertAsync(rows);
    }
  }

  async persistCollections(db, names) {
    const uniqueNames = [...new Set(names)];
    await Promise.all(uniqueNames.map((name) => this.replaceCollection(name, asArray(db[name]))));
  }

  findById(db, collection, id) {
    return asArray(db[collection]).find((item) => item._id === id);
  }

  enrichProduct(db, product) {
    return {
      ...product,
      seller: typeof product.seller === 'string' ? this.findById(db, 'sellers', product.seller) || { _id: product.seller, name: product.seller } : product.seller,
    };
  }

  matchesField(item, key, value) {
    if (value === undefined || value === null || value === '') return true;
    if (key === 'name') return String(item.name || '').toLowerCase().includes(String(value).toLowerCase());
    if (key === 'minPrice') return toNumber(item.price || item.salePrice) >= toNumber(value);
    if (key === 'maxPrice') return toNumber(item.price || item.salePrice) <= toNumber(value);
    if (!(key in item)) return true;

    const itemValue = idOf(item[key]);
    return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
  }

  purchasePaymentStatus(totalPrice, paid) {
    const total = toNumber(totalPrice);
    const paidAmount = toNumber(paid);
    if (paidAmount >= total && total > 0) return 'PAID';
    if (paidAmount > 0) return 'PARTIAL';
    return 'UNPAID';
  }

  filterPurchases(db, params = {}) {
    const search = String(params.search || '').toLowerCase();
    const sellerId = params.seller ? String(params.seller) : '';
    const startDate = params.startDate ? parseCalendarDate(params.startDate) : null;
    const endDate = params.endDate ? parseCalendarDate(params.endDate) : null;
    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(23, 59, 59, 999);

    return asArray(db.purchases).filter((purchase) => {
      if (search && !JSON.stringify(purchase).toLowerCase().includes(search)) return false;
      if (sellerId && String(purchase.seller?._id || purchase.seller) !== sellerId) return false;
      const purchaseTime = new Date(purchase.purchaseDate || purchase.createdAt).getTime();
      if (startDate && purchaseTime < startDate.getTime()) return false;
      if (endDate && purchaseTime > endDate.getTime()) return false;
      return true;
    });
  }

  purchaseSummary(db, params = {}) {
    const rows = this.filterPurchases(db, params);
    const totalPurchases = rows.reduce((sum, purchase) => sum + toNumber(purchase.totalPrice), 0);
    const totalPayments = rows.reduce((sum, purchase) => sum + toNumber(purchase.paid), 0);
    return response({
      totalPurchases,
      totalPayments,
      remaining: totalPurchases - totalPayments,
    });
  }

  getSellerPayableBalance(db, sellerId) {
    const rows = asArray(db['seller-ledgers']).filter((row) => String(row.seller?._id || row.seller) === String(sellerId));
    const purchases = rows.filter((row) => row.type === 'PURCHASE').reduce((sum, row) => sum + toNumber(row.amount), 0);
    const payments = rows.filter((row) => row.type === 'PAYMENT').reduce((sum, row) => sum + toNumber(row.amount), 0);
    return purchases - payments;
  }

  allocateSellerPaymentToPurchases(db, sellerId, amount) {
    let remaining = toNumber(amount);
    if (remaining <= 0 || !sellerId) return [];

    const updated = [];
    const purchases = asArray(db.purchases)
      .filter((purchase) => String(purchase.seller?._id || purchase.seller) === String(sellerId))
      .sort((a, b) => new Date(a.purchaseDate || a.createdAt) - new Date(b.purchaseDate || b.createdAt));

    purchases.forEach((purchase) => {
      if (remaining <= 0) return;
      const totalPrice = toNumber(purchase.totalPrice);
      const paid = toNumber(purchase.paid);
      const due = totalPrice - paid;
      if (due <= 0) return;

      const applied = Math.min(due, remaining);
      purchase.paid = paid + applied;
      purchase.paymentStatus = this.purchasePaymentStatus(totalPrice, purchase.paid);
      purchase.updatedAt = nowIso();
      remaining -= applied;
      updated.push(purchase);
    });

    return updated;
  }

  async reconcileSellerPaymentAllocations() {
    const markerPath = path.join(this.dbDir, '.seller-allocation-v1.done');
    if (fs.existsSync(markerPath)) return;

    const db = await this.readDb();
    const payments = asArray(db['seller-payments'])
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

    payments.forEach((payment) => {
      this.allocateSellerPaymentToPurchases(db, payment.seller, toNumber(payment.amount));
    });

    [...new Set(payments.map((payment) => String(payment.seller?._id || payment.seller)))].forEach((sellerId) => {
      if (sellerId) this.rebuildSellerLedger(db, sellerId);
    });

    if (payments.length) {
      await this.persistCollections(db, ['purchases', 'seller-ledgers']);
    }

    fs.writeFileSync(markerPath, '1');
  }

  paged(data, params = {}) {
    const search = String(params.search || '').toLowerCase();
    const filteredBySearch = search
      ? data.filter((item) => JSON.stringify(item).toLowerCase().includes(search))
      : data;
    const filtered = filteredBySearch.filter((item) => Object.entries(params).every(([key, value]) => {
      if (['page', 'limit', 'search', 'startDate', 'endDate', 'timeZone'].includes(key)) return true;
      return this.matchesField(item, key, value);
    }));
    const page = Math.max(toNumber(params.page) || 1, 1);
    const limit = Math.max(toNumber(params.limit) || filtered.length || 10, 1);
    const start = (page - 1) * limit;

    return response(filtered.slice(start, start + limit), 200, 'Success', {
      page,
      limit,
      total: filtered.length,
    });
  }

  addLedger(db, collection, payload) {
    db[collection] = [{ _id: makeId(collection), createdAt: nowIso(), ...payload }, ...asArray(db[collection])];
  }

  rebuildSellerLedger(db, sellerId) {
    if (!sellerId) return;
    const sid = String(sellerId);
    const other = asArray(db['seller-ledgers']).filter((row) => String(row.seller?._id || row.seller) !== sid);

    const purchases = asArray(db.purchases).filter((p) => String(p.seller?._id || p.seller) === sid)
      .sort((a, b) => new Date(a.createdAt || a.updatedAt || 0) - new Date(b.createdAt || b.updatedAt || 0));

    const payments = asArray(db['seller-payments']).filter((p) => String(p.seller?._id || p.seller) === sid)
      .sort((a, b) => new Date(a.createdAt || a.updatedAt || 0) - new Date(b.createdAt || b.updatedAt || 0));

    const rebuilt = [];

    purchases.forEach((p) => {
      const unitPrice = toNumber(p.unitPrice || p.purchasePrice || p.price);
      const quantity = toNumber(p.quantity);
      const total = toNumber(p.totalPrice || unitPrice * quantity);
      rebuilt.push({ _id: makeId('seller-ledgers'), createdAt: p.createdAt || nowIso(), seller: sid, type: 'PURCHASE', amount: total, debit: total, credit: 0, purchase: p._id, description: `Purchase: ${p.productName || ''}`.trim() });
      const paid = toNumber(p.paid ?? p.paidAmount);
      if (paid > 0) {
        rebuilt.push({ _id: makeId('seller-ledgers'), createdAt: p.createdAt || nowIso(), seller: sid, type: 'PAYMENT', amount: paid, debit: 0, credit: paid, purchase: p._id, description: `Purchase payment: ${p.productName || ''}`.trim() });
      }
    });

    // newest first like addLedger does
    db['seller-ledgers'] = [...rebuilt.reverse(), ...other];
  }

  resolveSellerId(db, sellerValue, extras = {}) {
    const candidates = [
      sellerValue,
      extras.companyId,
      extras.companyName,
      extras.sellerName,
    ].filter((value) => value !== undefined && value !== null && value !== '');

    for (const candidate of candidates) {
      const directId = idOf(candidate);
      if (directId && this.findById(db, 'sellers', directId)) return directId;

      const name = typeof candidate === 'string'
        ? candidate.trim()
        : String(candidate?.name || candidate?.companyName || '').trim();
      if (name) {
        const byName = asArray(db.sellers).find(
          (seller) => String(seller.name || '').toLowerCase() === name.toLowerCase(),
        );
        if (byName) return byName._id;
      }
    }

    return null;
  }

  requireSellerForPurchase(db, sellerValue, extras = {}) {
    const sellerId = this.resolveSellerId(db, sellerValue, extras);
    if (!sellerId || !this.findById(db, 'sellers', sellerId)) {
      const error = new Error('Selected company was not found');
      error.statusCode = 404;
      throw error;
    }
    return sellerId;
  }

  removePurchaseAccounting(db, purchaseId) {
    db['seller-ledgers'] = asArray(db['seller-ledgers']).filter((ledger) => ledger.purchase !== purchaseId);
    db['cashbox-transactions'] = asArray(db['cashbox-transactions']).filter((tx) => tx.purchase !== purchaseId);
  }

  syncPurchaseAccounting(db, purchase, options = {}) {
    const sellerId = this.requireSellerForPurchase(db, purchase.seller);
    const unitPrice = toNumber(purchase.unitPrice || purchase.purchasePrice || purchase.price);
    const quantity = toNumber(purchase.quantity);
    const paid = toNumber(purchase.paid ?? purchase.paidAmount);
    const totalAmount = unitPrice * quantity;

    purchase.seller = sellerId;
    purchase.unitPrice = unitPrice;
    purchase.quantity = quantity;
    purchase.paid = paid;
    purchase.totalPrice = totalAmount;
    purchase.paymentStatus = paid >= totalAmount ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID';

    // Remove any previous accounting rows for this purchase and regenerate seller ledger
    this.removePurchaseAccounting(db, purchase._id);
    if (paid > 0) {
      this.addCashbox(db, 'OUT', paid, 'PURCHASE_PAYMENT', purchase.productName, options.actor, {
        purchase: purchase._id,
        seller: sellerId,
        product: options.productId || purchase.product,
        companyName: purchase.companyName || purchase.sellerName,
        invoiceNumber: purchase.invoiceNumber || '',
        sourceModule: 'PURCHASES',
        module: 'PURCHASES',
      });
    }

    // Rebuild seller ledger deterministically from purchases + seller-payments
    this.rebuildSellerLedger(db, sellerId);

    return purchase;
  }

  normalizeCashboxTransactionType(type) {
    const legacyMap = {
      SALE: 'SALE_INCOME',
      CUSTOMER_PAYMENT: 'DEBT_PAYMENT',
      SELLER_PAYMENT: 'COMPANY_DEBT_PAYMENT',
      SALARY: 'SALARY_PAYMENT',
      OPERATOR_ACCOUNT: 'PERSON_DEPOSIT',
    };
    return legacyMap[type] || type || 'MANUAL';
  }

  cashboxModuleForType(transactionType) {
    const map = {
      SALE_INCOME: 'SALES',
      DEBT_PAYMENT: 'DEBTORS',
      PURCHASE_PAYMENT: 'PURCHASES',
      COMPANY_DEBT_PAYMENT: 'PURCHASES',
      EXPENSE: 'EXPENSES',
      SALARY_PAYMENT: 'EMPLOYEES',
      PERSON_DEPOSIT: 'CASHBOX',
      PERSON_WITHDRAWAL: 'CASHBOX',
      SALE_RETURN: 'SALES',
      TRANSFER: 'CASHBOX',
      MANUAL: 'CASHBOX',
    };
    return map[transactionType] || 'CASHBOX';
  }

  resolveRequestLanguage(request = {}) {
    const language = request.language || request.params?.language || request.body?.language;
    return ['en', 'fa', 'ps'].includes(language) ? language : 'fa';
  }

  cashboxLocaleCatalog(language = 'fa') {
    const lang = ['en', 'fa', 'ps'].includes(language) ? language : 'fa';
    const catalog = {
      en: {
        SALE_INCOME: { reason: 'Medicine Sale', notePrefix: 'Medicine sale' },
        PURCHASE_PAYMENT: { reason: 'Purchase', notePrefix: 'Purchase payment' },
        DEBT_PAYMENT: { reason: 'Customer Debt Payment', notePrefix: 'Customer debt payment' },
        COMPANY_DEBT_PAYMENT: { reason: 'Company Debt Payment', notePrefix: 'Company debt payment' },
        EXPENSE: { reason: 'Expense', notePrefix: 'Expense' },
        SALARY_PAYMENT: { reason: 'Employee Salary', notePrefix: 'Salary payment' },
        PERSON_DEPOSIT: { reason: 'Cash Deposit', notePrefix: 'Cash deposit' },
        PERSON_WITHDRAWAL: { reason: 'Cash Withdrawal', notePrefix: 'Cash withdrawal' },
        SALE_RETURN: { reason: 'Sale Return', notePrefix: 'Sale return' },
        TRANSFER: { reason: 'Money Transfer', notePrefix: 'Money transfer' },
        MANUAL: { reason: 'Cash Transaction', notePrefix: 'Cash transaction' },
      },
      fa: {
        SALE_INCOME: { reason: 'فروش دوا', notePrefix: 'فروش دوا' },
        PURCHASE_PAYMENT: { reason: 'خریداری', notePrefix: 'پرداخت خریداری' },
        DEBT_PAYMENT: { reason: 'پرداخت قرض مشتری', notePrefix: 'پرداخت قرض مشتری' },
        COMPANY_DEBT_PAYMENT: { reason: 'پرداخت قرض شرکت', notePrefix: 'پرداخت قرض شرکت' },
        EXPENSE: { reason: 'مصرف', notePrefix: 'مصرف' },
        SALARY_PAYMENT: { reason: 'معاش کارمند', notePrefix: 'پرداخت معاش' },
        PERSON_DEPOSIT: { reason: 'سپرده نقد', notePrefix: 'سپرده نقد' },
        PERSON_WITHDRAWAL: { reason: 'برداشت نقد', notePrefix: 'برداشت نقد' },
        SALE_RETURN: { reason: 'برگشت فروش', notePrefix: 'برگشت فروش' },
        TRANSFER: { reason: 'انتقال پول', notePrefix: 'انتقال پول' },
        MANUAL: { reason: 'تراکنش نقد', notePrefix: 'تراکنش نقد' },
      },
      ps: {
        SALE_INCOME: { reason: 'د درمل پلور', notePrefix: 'د درمل پلور' },
        PURCHASE_PAYMENT: { reason: 'پېرود', notePrefix: 'د پېرود تادیه' },
        DEBT_PAYMENT: { reason: 'د پېرودونکي پور تادیه', notePrefix: 'د پېرودونکي پور تادیه' },
        COMPANY_DEBT_PAYMENT: { reason: 'د شرکت پور تادیه', notePrefix: 'د شرکت پور تادیه' },
        EXPENSE: { reason: 'لګښت', notePrefix: 'لګښت' },
        SALARY_PAYMENT: { reason: 'د کارمند معاش', notePrefix: 'د معاش تادیه' },
        PERSON_DEPOSIT: { reason: 'نغدي زیرمه', notePrefix: 'نغدي زیرمه' },
        PERSON_WITHDRAWAL: { reason: 'نغدي ایستل', notePrefix: 'نغدي ایستل' },
        SALE_RETURN: { reason: 'د پلور بیرته راګرځول', notePrefix: 'د پلور بیرته راګرځول' },
        TRANSFER: { reason: 'د پیسو انتقال', notePrefix: 'د پیسو انتقال' },
        MANUAL: { reason: 'نغدي معامله', notePrefix: 'نغدي معامله' },
      },
    };
    return catalog[lang];
  }

  cashboxReasonForType(transactionType, language = 'fa') {
    const entry = this.cashboxLocaleCatalog(language)[transactionType] || this.cashboxLocaleCatalog('en')[transactionType];
    return entry?.reason || transactionType || 'Cash Transaction';
  }

  cashboxAutoNote(transactionType, language = 'fa', detail = '') {
    const entry = this.cashboxLocaleCatalog(language)[transactionType] || this.cashboxLocaleCatalog('en')[transactionType];
    const prefix = entry?.notePrefix || entry?.reason || transactionType;
    const trimmed = String(detail || '').trim();
    if (!trimmed) return prefix;
    if (trimmed.toLowerCase().startsWith(String(prefix).toLowerCase())) return trimmed;
    return `${prefix}: ${trimmed}`;
  }

  getCashboxBalance(db) {
    return asArray(db['cashbox-transactions']).reduce((balance, row) => {
      const amount = toNumber(row.amount);
      return row.direction === 'IN' ? balance + amount : balance - amount;
    }, 0);
  }

  addCashbox(db, direction, amount, transactionType, note, actor, extra = {}) {
    let normalizedType = this.normalizeCashboxTransactionType(transactionType);
    if (extra.transactionType === 'WITHDRAWAL') normalizedType = 'PERSON_WITHDRAWAL';
    if (extra.transactionType === 'DEPOSIT' && ['OPERATOR_ACCOUNT', 'PERSON_DEPOSIT'].includes(normalizedType)) {
      normalizedType = 'PERSON_DEPOSIT';
    }

    const value = toNumber(amount);
    const balanceBefore = this.getCashboxBalance(db);
    const balanceAfter = direction === 'IN' ? balanceBefore + value : balanceBefore - value;
    const timestamp = nowIso();
    const moduleName = extra.module || extra.sourceModule || this.cashboxModuleForType(normalizedType);
    const language = extra.language || this.requestLanguage || 'fa';
    const linkedReferenceId = extra.referenceId
      || extra.sale
      || extra.purchase
      || extra.payment
      || extra.expense
      || extra.salaryPayment
      || extra.transfer
      || extra.debtorAccount
      || extra.personAccountKey
      || undefined;
    const reason = String(extra.reason || '').trim() || this.cashboxReasonForType(normalizedType, language);
    const localizedNote = String(extra.notes || extra.note || '').trim()
      || this.cashboxAutoNote(normalizedType, language, note);

    const tx = {
      _id: makeId('cashbox'),
      ...extra,
      type: normalizedType,
      transactionType: normalizedType,
      direction,
      amount: value,
      source: normalizedType,
      sourceModule: moduleName,
      module: moduleName,
      note: localizedNote,
      notes: localizedNote,
      description: localizedNote,
      reason,
      businessReference: normalizedType,
      language,
      actor: actor || 'System',
      performedBy: actor || 'System',
      createdAt: extra.createdAt || timestamp,
      date: extra.date || String(extra.createdAt || timestamp).slice(0, 10) || todayIso(),
      referenceId: linkedReferenceId,
      relatedCashboxReference: this.cashboxReasonForType(normalizedType, language),
      balanceBefore,
      balanceAfter,
    };

    db['cashbox-transactions'] = [tx, ...asArray(db['cashbox-transactions'])];
    return tx;
  }

  enrichCashboxTransactions(db) {
    const rows = asArray(db['cashbox-transactions']);
    const chronological = [...rows].sort(
      (a, b) => new Date(a.createdAt || a.date || 0).getTime() - new Date(b.createdAt || b.date || 0).getTime(),
    );
    let running = 0;
    const balanceMap = new Map();

    chronological.forEach((row) => {
      const amount = toNumber(row.amount);
      const before = running;
      running = row.direction === 'IN' ? running + amount : running - amount;
      balanceMap.set(row._id, {
        balanceBefore: row.balanceBefore ?? before,
        balanceAfter: row.balanceAfter ?? running,
      });
    });

    return rows.map((row) => {
      const transactionType = this.normalizeCashboxTransactionType(row.transactionType || row.type);
      const balances = balanceMap.get(row._id) || {};
      return {
        ...row,
        type: transactionType,
        transactionType,
        sourceModule: row.sourceModule || row.module || this.cashboxModuleForType(transactionType),
        module: row.module || row.sourceModule || this.cashboxModuleForType(transactionType),
        referenceId: row.referenceId || row.relatedCashboxReference || row.sale || row.purchase || row.payment || row.expense || row.salaryPayment || row.transfer || row.debtorAccount,
        reason: row.reason || this.cashboxReasonForType(transactionType, row.language || 'fa'),
        notes: row.notes || row.note || row.description || this.cashboxAutoNote(transactionType, row.language || 'fa', ''),
        relatedCashboxReference: row.relatedCashboxReference || this.cashboxReasonForType(transactionType, row.language || 'fa'),
        businessReference: row.businessReference || transactionType,
        ...balances,
      };
    });
  }

  buildCashboxTimestamp(body = {}) {
    if (body.createdAt) return body.createdAt;
    const datePart = body.date || todayIso();
    const timePart = body.time || new Date().toTimeString().slice(0, 5);
    const parsed = new Date(`${datePart}T${timePart}`);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    return nowIso();
  }

  recalculateCashboxBalances(db) {
    const rows = asArray(db['cashbox-transactions']);
    const chronological = [...rows].sort(
      (a, b) => new Date(a.createdAt || a.date || 0).getTime() - new Date(b.createdAt || b.date || 0).getTime(),
    );
    let running = 0;
    const updates = new Map();
    chronological.forEach((row) => {
      const amount = toNumber(row.amount);
      const before = running;
      running = row.direction === 'IN' ? running + amount : running - amount;
      updates.set(row._id, { balanceBefore: before, balanceAfter: running });
    });
    db['cashbox-transactions'] = rows.map((row) => {
      const balances = updates.get(row._id);
      return balances ? { ...row, ...balances, updatedAt: row.updatedAt || row.createdAt } : row;
    });
  }

  filterCashboxTransactions(rows, params = {}) {
    const startDate = params.startDate ? parseCalendarDate(params.startDate) : null;
    const endDate = params.endDate ? parseCalendarDate(params.endDate) : null;
    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(23, 59, 59, 999);

    let filtered = rows.filter((row) => {
      const rowTime = new Date(row.createdAt || row.date || 0).getTime();
      if (startDate && rowTime < startDate.getTime()) return false;
      if (endDate && rowTime > endDate.getTime()) return false;
      if (params.direction && row.direction !== params.direction) return false;
      if (params.type) {
        const txType = row.transactionType || row.type;
        if (txType !== params.type) return false;
      }
      return true;
    });

    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
    filtered = [...filtered].sort((a, b) => {
      let aVal;
      let bVal;
      if (sortBy === 'amount') {
        aVal = toNumber(a.amount);
        bVal = toNumber(b.amount);
      } else if (sortBy === 'direction') {
        aVal = a.direction || '';
        bVal = b.direction || '';
      } else {
        aVal = new Date(a.createdAt || a.date || 0).getTime();
        bVal = new Date(b.createdAt || b.date || 0).getTime();
      }
      if (aVal < bVal) return -sortOrder;
      if (aVal > bVal) return sortOrder;
      return 0;
    });

    return filtered;
  }

  updateCashboxTransaction(db, id, body = {}) {
    const item = this.findById(db, 'cashbox-transactions', id);
    if (!item) return response(null, 404, 'Cashbox transaction not found');

    if (body.amount !== undefined) {
      const amount = toNumber(body.amount);
      if (amount <= 0) return response(null, 400, 'Amount must be greater than zero');
      item.amount = amount;
    }
    if (body.reason !== undefined) item.reason = String(body.reason || '').trim();
    if (body.notes !== undefined || body.note !== undefined || body.description !== undefined) {
      const notes = body.notes ?? body.note ?? body.description ?? '';
      item.notes = String(notes || '').trim();
      item.note = item.notes;
      item.description = item.notes;
    }
    if (body.reference !== undefined || body.referenceId !== undefined || body.relatedCashboxReference !== undefined) {
      const reference = String(body.reference ?? body.referenceId ?? body.relatedCashboxReference ?? '').trim();
      item.referenceId = reference || undefined;
      item.relatedCashboxReference = reference || undefined;
    }
    item.updatedAt = nowIso();
    this.recalculateCashboxBalances(db);
    const enriched = this.enrichCashboxTransactions(db).find((row) => row._id === id) || item;
    return response(enriched, 200, 'Cashbox transaction updated successfully!');
  }

  deleteCashboxTransaction(db, id) {
    const item = this.findById(db, 'cashbox-transactions', id);
    if (!item) return response(null, 404, 'Cashbox transaction not found');
    db['cashbox-transactions'] = asArray(db['cashbox-transactions']).filter((row) => row._id !== id);
    this.recalculateCashboxBalances(db);
    return response(null, 200, 'Cashbox transaction deleted successfully!');
  }

  customerDebtTotal(db) {
    const ledgerDebt = asArray(db['customer-ledgers']).reduce((total, row) => {
      if (row.type === 'DEBIT') return total + toNumber(row.amount);
      if (row.type === 'CREDIT') return total - toNumber(row.amount);
      return total;
    }, 0);
    const debtorDebt = asArray(db['customer-debtor-accounts'])
      .filter((account) => account.status === 'ACTIVE')
      .reduce((total, account) => {
        const debt = asArray(account.debtEntries).reduce((sum, entry) => sum + toNumber(entry.amount), 0);
        const paid = asArray(account.paymentEntries).reduce((sum, entry) => sum + toNumber(entry.amount), 0);
        return total + Math.max(debt - paid, 0);
      }, 0);
    return Math.max(ledgerDebt + debtorDebt, 0);
  }

  companyDebtTotal(db) {
    return asArray(db['seller-ledgers']).reduce((total, row) => {
      if (row.type === 'PURCHASE') return total + toNumber(row.amount);
      if (row.type === 'PAYMENT') return total - toNumber(row.amount);
      return total;
    }, 0);
  }

  cashboxSummary(db) {
    const rows = this.enrichCashboxTransactions(db);
    const cashIn = rows.filter((row) => row.direction === 'IN').reduce((sum, row) => sum + toNumber(row.amount), 0);
    const cashOut = rows.filter((row) => row.direction === 'OUT').reduce((sum, row) => sum + toNumber(row.amount), 0);
    const todayKey = todayIso();
    const todayRows = rows.filter((row) => String(row.date || row.createdAt || '').slice(0, 10) === todayKey);
    const todayCashIn = todayRows.filter((row) => row.direction === 'IN').reduce((sum, row) => sum + toNumber(row.amount), 0);
    const todayCashOut = todayRows.filter((row) => row.direction === 'OUT').reduce((sum, row) => sum + toNumber(row.amount), 0);
    const todaySalesIncome = todayRows
      .filter((row) => row.transactionType === 'SALE_INCOME')
      .reduce((sum, row) => sum + toNumber(row.amount), 0);
    const todayProfit = todayRows
      .filter((row) => row.transactionType === 'SALE_INCOME')
      .reduce((sum, row) => sum + toNumber(row.saleProfit || 0), 0);

    return response({
      cashIn,
      cashOut,
      balance: cashIn - cashOut,
      todayCashIn,
      todayCashOut,
      todaySalesIncome,
      todayProfit,
      customerDebtTotal: this.customerDebtTotal(db),
      companyDebtTotal: Math.max(this.companyDebtTotal(db), 0),
      transactionCount: rows.length,
    });
  }

  cashboxPersonAccounts(db, params = {}) {
    const accounts = new Map();
    asArray(db['cashbox-transactions'])
      .filter((row) => String(row.actor || row.performedBy || row.personName || '').trim())
      .sort((a, b) => new Date(a.createdAt || a.date || 0).getTime() - new Date(b.createdAt || b.date || 0).getTime())
      .forEach((row) => {
        const personName = String(row.actor || row.performedBy || row.personName || '').trim();
        const transactionType = row.transactionType || (row.direction === 'IN' ? 'DEPOSIT' : 'WITHDRAWAL');
        if (!personName) return;
        const existing = accounts.get(personName) || {
          personName,
          totalDeposited: 0,
          totalWithdrawn: 0,
          currentNetBalance: 0,
          transactions: [],
        };
        const amount = toNumber(row.amount);
        if (transactionType === 'DEPOSIT') existing.totalDeposited += amount;
        if (transactionType === 'WITHDRAWAL') existing.totalWithdrawn += amount;
        existing.currentNetBalance = existing.totalDeposited - existing.totalWithdrawn;
        existing.transactions.push({
          _id: row._id,
          date: row.createdAt || row.date,
          transactionType,
          deposit: transactionType === 'DEPOSIT' ? amount : 0,
          withdrawal: transactionType === 'WITHDRAWAL' ? amount : 0,
          amount,
          resultingBalance: existing.currentNetBalance,
          description: row.description || row.note,
          operator: row.actor || row.performedBy,
          relatedCustomer: row.relatedCustomer || row.customer,
          relatedCashboxReference: row.relatedCashboxReference || row.referenceId || row._id,
          sourceModule: row.sourceModule || row.source || row.type,
        });
        accounts.set(personName, existing);
      });

    const search = String(params.search || '').trim().toLowerCase();
    let data = Array.from(accounts.values()).map((account) => ({
      ...account,
      transactions: account.transactions.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()),
    })).sort((a, b) => a.personName.localeCompare(b.personName));
    if (search) {
      data = data.filter((account) =>
        account.personName.toLowerCase().includes(search)
        || account.transactions.some((tx) =>
          [tx.description, tx.operator, tx.relatedCustomer, tx.relatedCashboxReference, tx.sourceModule]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(search))
        )
      );
    }
    return response(data);
  }

  formatCustomerDebtorAccount(doc) {
    const debtEntries = asArray(doc.debtEntries).map((entry) => ({
      _id: entry._id,
      date: entry.date,
      amount: toNumber(entry.amount),
      reason: entry.reason || '',
      notes: entry.notes || '',
      medicinesTaken: entry.medicinesTaken || '',
      saleId: entry.saleId,
      createdAt: entry.createdAt,
    }));

    const paymentEntries = asArray(doc.paymentEntries).map((entry) => ({
      _id: entry._id,
      date: entry.date,
      amount: toNumber(entry.amount),
      note: entry.note || '',
      customerPaymentId: entry.customerPaymentId,
      createdAt: entry.createdAt,
    }));

    const totalDebt = debtEntries.reduce((sum, entry) => sum + toNumber(entry.amount), 0);
    const totalPayments = paymentEntries.reduce((sum, entry) => sum + toNumber(entry.amount), 0);
    const currentDebt = doc.status === 'ACTIVE' ? Math.max(totalDebt - totalPayments, 0) : 0;
    const lastDebtDate = debtEntries.length
      ? debtEntries.reduce((latest, entry) => {
          const value = new Date(entry.date || 0).getTime();
          return value > new Date(latest || 0).getTime() ? entry.date : latest;
        }, debtEntries[0].date)
      : undefined;

    return {
      _id: doc._id,
      customerId: doc.customerId,
      customerName: doc.customerName,
      accountKey: doc.accountKey,
      status: doc.status || 'ACTIVE',
      accountNotes: doc.accountNotes || '',
      accountCreatedAt: doc.createdAt,
      totalDebt: doc.status === 'SETTLED' ? toNumber(doc.settlementTotalDebt || totalDebt) : totalDebt,
      totalPayments: doc.status === 'SETTLED' ? toNumber(doc.settlementPaymentsTotal || totalPayments) : totalPayments,
      currentDebt,
      debtEntries,
      paymentEntries,
      settledAt: doc.settledAt,
      settlementTotalDebt: doc.settlementTotalDebt,
      settlementPaymentsTotal: doc.settlementPaymentsTotal,
      settlementReasonSummary: doc.settlementReasonSummary || '',
      lastDebtDate,
    };
  }

  customerDebtorSummary(db, params = {}) {
    const status = String(params.status || 'active').toLowerCase();
    const rows = asArray(db['customer-debtor-accounts'])
      .map((doc) => this.formatCustomerDebtorAccount(doc))
      .filter((account) => (status === 'settled' ? account.status === 'SETTLED' : account.status === 'ACTIVE'));

    return {
      customers: rows.length,
      totalDebt: rows.reduce((sum, account) => sum + toNumber(status === 'active' ? account.currentDebt : account.totalDebt), 0),
      totalPayments: rows.reduce((sum, account) => sum + toNumber(account.totalPayments), 0),
    };
  }

  findActiveDebtorAccountIndex(accounts, { accountKey, customerId }) {
    return accounts.findIndex((account) => {
      if (account.status !== 'ACTIVE') return false;
      if (customerId && account.customerId && String(account.customerId) === String(customerId)) return true;
      return account.accountKey === accountKey;
    });
  }

  finalizeDebtorAccountSettlement(account) {
    const totalDebt = asArray(account.debtEntries).reduce((sum, entry) => sum + toNumber(entry.amount), 0);
    const totalPayments = asArray(account.paymentEntries).reduce((sum, entry) => sum + toNumber(entry.amount), 0);
    account.status = 'SETTLED';
    account.settledAt = nowIso();
    account.settlementTotalDebt = totalDebt;
    account.settlementPaymentsTotal = totalPayments;
    account.settlementReasonSummary = asArray(account.debtEntries)
      .map((entry) => entry.reason?.trim())
      .filter(Boolean)
      .join('; ');
    account.updatedAt = nowIso();
    return account;
  }

  upsertCustomerDebtorDebt(db, payload = {}) {
    const customerName = String(payload.customerName || '').trim().replace(/\s+/g, ' ');
    const accountKey = normalizeAccountKey(customerName);
    const amount = toNumber(payload.amount);
    const reason = String(payload.reason || '').trim();

    if (!customerName) return { error: response(null, 400, 'Customer name is required') };
    if (amount <= 0) return { error: response(null, 400, 'Amount must be greater than zero') };
    if (!reason) return { error: response(null, 400, 'Debt reason is required') };

    const debtEntry = {
      _id: makeId('debt_entry'),
      date: payload.date || nowIso(),
      amount,
      reason,
      notes: payload.notes?.trim() || '',
      medicinesTaken: payload.medicinesTaken?.trim() || '',
      saleId: payload.saleId,
      createdAt: nowIso(),
    };

    const accounts = asArray(db['customer-debtor-accounts']);
    const existingIndex = this.findActiveDebtorAccountIndex(accounts, {
      accountKey,
      customerId: payload.customerId,
    });

    let account;
    if (existingIndex >= 0) {
      account = { ...accounts[existingIndex] };
      account.debtEntries = [...asArray(account.debtEntries), debtEntry];
      if (payload.customerId && !account.customerId) account.customerId = payload.customerId;
      if (payload.accountNotes?.trim()) account.accountNotes = payload.accountNotes.trim();
      account.updatedAt = nowIso();
      accounts[existingIndex] = account;
    } else {
      account = {
        _id: makeId('customer_debtor_account'),
        customerId: payload.customerId || undefined,
        customerName,
        accountKey,
        status: 'ACTIVE',
        accountNotes: payload.accountNotes?.trim() || '',
        debtEntries: [debtEntry],
        paymentEntries: [],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      accounts.unshift(account);
    }

    db['customer-debtor-accounts'] = accounts;
    return { account };
  }

  applyCustomerDebtorPayment(db, payload = {}) {
    const amount = toNumber(payload.amount);
    if (amount <= 0) return { error: response(null, 400, 'Amount must be greater than zero') };

    const accounts = asArray(db['customer-debtor-accounts']);
    let index = -1;
    if (payload.accountId) {
      index = accounts.findIndex((account) => account._id === payload.accountId && account.status === 'ACTIVE');
    }
    if (index < 0 && payload.customerId) {
      index = this.findActiveDebtorAccountIndex(accounts, { customerId: payload.customerId });
    }
    if (index < 0 && payload.customerName) {
      index = this.findActiveDebtorAccountIndex(accounts, { accountKey: normalizeAccountKey(payload.customerName) });
    }
    if (index < 0) return { error: response(null, 404, 'Active debtor account is not found!') };

    const account = { ...accounts[index] };
    const totalDebt = asArray(account.debtEntries).reduce((sum, entry) => sum + toNumber(entry.amount), 0);
    const totalPayments = asArray(account.paymentEntries).reduce((sum, entry) => sum + toNumber(entry.amount), 0);
    const currentDebt = Math.max(totalDebt - totalPayments, 0);
    if (amount > currentDebt + 0.0001) {
      return { error: response(null, 400, 'Payment cannot exceed customer debt') };
    }

    const paymentEntry = {
      _id: makeId('debt_payment'),
      date: payload.date || nowIso(),
      amount,
      note: payload.note?.trim() || '',
      customerPaymentId: payload.customerPaymentId,
      createdAt: nowIso(),
    };
    account.paymentEntries = [...asArray(account.paymentEntries), paymentEntry];
    account.updatedAt = nowIso();

    const nextDebt = Math.max(totalDebt - totalPayments - amount, 0);
    if (nextDebt <= 0.0001 && totalDebt > 0) {
      this.finalizeDebtorAccountSettlement(account);
    }

    accounts[index] = account;
    db['customer-debtor-accounts'] = accounts;
    return { account };
  }

  syncCreditSaleToDebtorAccount(db, payload = {}) {
    const dueAmount = toNumber(payload.dueAmount);
    if (dueAmount <= 0) return null;

    const customer = payload.customerId ? this.findById(db, 'customers', payload.customerId) : null;
    const customerName = String(customer?.name || payload.customerName || payload.buyerName || '').trim().replace(/\s+/g, ' ');
    if (!customerName) return null;

    const medicinesTaken = String(payload.medicinesTaken || '').trim()
      || asArray(payload.medicines).map((item) => String(item).trim()).filter(Boolean).join(', ');

    const result = this.upsertCustomerDebtorDebt(db, {
      customerId: customer?._id || payload.customerId,
      customerName,
      date: payload.date || todayIso(),
      amount: dueAmount,
      reason: payload.reason || `Credit sale${medicinesTaken ? `: ${medicinesTaken}` : ''}`,
      notes: payload.notes?.trim() || '',
      medicinesTaken,
      saleId: payload.saleId || payload.transactionId,
    });
    return result.error ? null : result.account;
  }

  customerDebtorAccountsList(db, params = {}) {
    const status = String(params.status || 'active').toLowerCase();
    const search = String(params.search || '').trim().toLowerCase();
    let rows = asArray(db['customer-debtor-accounts']).map((doc) => this.formatCustomerDebtorAccount(doc));

    rows = rows.filter((account) => (status === 'settled' ? account.status === 'SETTLED' : account.status === 'ACTIVE'));

    if (search) {
      rows = rows.filter((account) =>
        [account.customerName, account.settlementReasonSummary, account.accountNotes]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search))
      );
    }

    rows.sort((a, b) => new Date(b.lastDebtDate || b.accountCreatedAt || 0).getTime() - new Date(a.lastDebtDate || a.accountCreatedAt || 0).getTime());
    const result = this.paged(rows, { ...params, search: '', status: '' });
    return { ...result, summary: this.customerDebtorSummary(db, params) };
  }

  getCustomerDebtorAccount(db, id) {
    const doc = this.findById(db, 'customer-debtor-accounts', id);
    if (!doc) return response(null, 404, 'Debtor account is not found!');
    return response(this.formatCustomerDebtorAccount(doc));
  }

  async addCustomerDebtorDebt(db, body = {}) {
    const result = this.upsertCustomerDebtorDebt(db, body);
    if (result.error) return result.error;
    await this.persistCollections(db, ['customer-debtor-accounts']);
    return response(this.formatCustomerDebtorAccount(result.account), 201, 'Customer debt recorded successfully!');
  }

  async addCustomerDebtorPayment(db, body = {}) {
    const amount = toNumber(body.amount);
    if (amount <= 0) return response(null, 400, 'Amount must be greater than zero');

    const accounts = asArray(db['customer-debtor-accounts']);
    let index = -1;
    if (body.accountId) {
      index = accounts.findIndex((account) => account._id === body.accountId && account.status === 'ACTIVE');
    }
    if (index < 0 && body.customerId) {
      index = this.findActiveDebtorAccountIndex(accounts, { customerId: body.customerId });
    }
    if (index < 0 && body.customerName) {
      index = this.findActiveDebtorAccountIndex(accounts, { accountKey: normalizeAccountKey(body.customerName) });
    }
    if (index < 0) return response(null, 404, 'Active debtor account is not found!');

    const account = { ...accounts[index] };
    const totalDebt = asArray(account.debtEntries).reduce((sum, entry) => sum + toNumber(entry.amount), 0);
    const totalPayments = asArray(account.paymentEntries).reduce((sum, entry) => sum + toNumber(entry.amount), 0);
    const currentDebt = Math.max(totalDebt - totalPayments, 0);
    if (amount > currentDebt + 0.0001) {
      return response(null, 400, 'Payment cannot exceed customer debt');
    }

    const paymentDate = body.date || nowIso();
    const customerPayment = account.customerId ? {
      _id: makeId('customer-payments'),
      createdAt: nowIso(),
      customer: account.customerId,
      amount,
      paymentDate,
      note: body.note?.trim() || `Debtor payment: ${account.customerName}`,
    } : null;

    if (customerPayment) {
      db['customer-payments'] = [customerPayment, ...asArray(db['customer-payments'])];
      this.addLedger(db, 'customer-ledgers', {
        customer: account.customerId,
        type: 'CREDIT',
        amount,
        payment: customerPayment._id,
        note: customerPayment.note,
      });
      this.addCashbox(db, 'IN', amount, 'DEBT_PAYMENT', customerPayment.note, body.actor || body.performedBy || body.receivedBy || account.customerName, {
        customer: account.customerId,
        payment: customerPayment._id,
        debtorAccount: account._id,
        customerName: account.customerName,
        sourceModule: 'DEBTORS',
        module: 'DEBTORS',
      });
    } else {
      this.addCashbox(db, 'IN', amount, 'DEBT_PAYMENT', body.note || `Debtor payment: ${account.customerName}`, body.actor || body.performedBy || body.receivedBy || account.customerName, {
        debtorAccount: account._id,
        customerName: account.customerName,
        sourceModule: 'DEBTORS',
        module: 'DEBTORS',
      });
    }

    const paymentEntry = {
      _id: makeId('debt_payment'),
      date: paymentDate,
      amount,
      note: body.note?.trim() || '',
      customerPaymentId: customerPayment?._id,
      createdAt: nowIso(),
    };
    account.paymentEntries = [...asArray(account.paymentEntries), paymentEntry];
    account.updatedAt = nowIso();

    const nextDebt = Math.max(totalDebt - totalPayments - amount, 0);
    if (nextDebt <= 0.0001 && totalDebt > 0) {
      this.finalizeDebtorAccountSettlement(account);
    }

    accounts[index] = account;
    db['customer-debtor-accounts'] = accounts;
    await this.persistCollections(db, ['customer-debtor-accounts', 'customer-payments', 'customer-ledgers', 'cashbox-transactions']);

    const message = account.status === 'SETTLED'
      ? 'Customer payment recorded and account settled successfully!'
      : 'Customer payment recorded successfully!';
    return response(this.formatCustomerDebtorAccount(account), 201, message);
  }

  async settleCustomerDebtorAccount(db, id) {
    const accounts = asArray(db['customer-debtor-accounts']);
    const index = accounts.findIndex((account) => account._id === id && account.status === 'ACTIVE');
    if (index < 0) return response(null, 404, 'Active debtor account is not found!');

    const account = { ...accounts[index] };
    const totalDebt = asArray(account.debtEntries).reduce((sum, entry) => sum + toNumber(entry.amount), 0);
    const totalPayments = asArray(account.paymentEntries).reduce((sum, entry) => sum + toNumber(entry.amount), 0);
    const currentDebt = Math.max(totalDebt - totalPayments, 0);
    if (totalDebt <= 0) return response(null, 400, 'Account has no debt to settle');

    if (currentDebt <= 0.0001) {
      this.finalizeDebtorAccountSettlement(account);
    } else {
      account.status = 'SETTLED';
      account.settledAt = nowIso();
      account.settlementTotalDebt = totalDebt;
      account.settlementPaymentsTotal = totalPayments;
      account.settlementReasonSummary = asArray(account.debtEntries)
        .map((entry) => entry.reason?.trim())
        .filter(Boolean)
        .join('; ');
      account.updatedAt = nowIso();
    }

    accounts[index] = account;
    db['customer-debtor-accounts'] = accounts;
    await this.persistCollections(db, ['customer-debtor-accounts']);
    return response(this.formatCustomerDebtorAccount(account), 200, 'Debtor account settled successfully!');
  }

  async updateCustomerDebtorAccount(db, id, body = {}) {
    const accounts = asArray(db['customer-debtor-accounts']);
    const index = accounts.findIndex((account) => account._id === id);
    if (index < 0) return response(null, 404, 'Debtor account is not found!');

    const account = { ...accounts[index] };
    if (body.customerName?.trim()) {
      const customerName = String(body.customerName).trim().replace(/\s+/g, ' ');
      const accountKey = normalizeAccountKey(customerName);
      const conflict = accounts.some(
        (row, rowIndex) => rowIndex !== index && row.accountKey === accountKey && row.status === 'ACTIVE' && account.status === 'ACTIVE',
      );
      if (conflict) return response(null, 400, 'An active debtor account already exists for this customer');
      account.customerName = customerName;
      account.accountKey = accountKey;
    }
    if (body.accountNotes !== undefined) account.accountNotes = String(body.accountNotes || '').trim();
    account.updatedAt = nowIso();
    accounts[index] = account;
    db['customer-debtor-accounts'] = accounts;
    await this.persistCollections(db, ['customer-debtor-accounts']);
    return response(this.formatCustomerDebtorAccount(account), 200, 'Updated successfully');
  }

  async deleteCustomerDebtorAccount(db, id) {
    const accounts = asArray(db['customer-debtor-accounts']);
    const next = accounts.filter((account) => account._id !== id);
    if (next.length === accounts.length) return response(null, 404, 'Debtor account is not found!');
    db['customer-debtor-accounts'] = next;
    await this.persistCollections(db, ['customer-debtor-accounts']);
    return response(null, 200, 'Deleted successfully');
  }

  mergeDuplicateCashboxPersonAccounts(accounts) {
    const merged = new Map();
    for (const account of asArray(accounts)) {
      const accountKey = account.accountKey || normalizeAccountKey(account.personName);
      const existing = merged.get(accountKey);
      if (!existing) {
        merged.set(accountKey, { ...account, accountKey, transactions: [...asArray(account.transactions)] });
        continue;
      }
      existing.transactions = [...asArray(existing.transactions), ...asArray(account.transactions)];
      if (new Date(account.createdAt || 0).getTime() < new Date(existing.createdAt || 0).getTime()) {
        existing.createdAt = account.createdAt;
      }
      existing.updatedAt = nowIso();
    }
    return Array.from(merged.values());
  }

  formatCashboxPersonAccount(doc) {
    const personName = doc.personName || '';
    const transactions = [...asArray(doc.transactions)]
      .map((entry) => ({
        _id: entry._id,
        personName: entry.personName || personName,
        date: entry.date,
        amount: toNumber(entry.amount),
        transactionType: entry.transactionType,
        reason: entry.reason || '',
        notes: entry.notes || '',
        createdAt: entry.createdAt,
      }))
      .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());

    const totalDeposited = transactions
      .filter((entry) => entry.transactionType === 'DEPOSIT')
      .reduce((sum, entry) => sum + entry.amount, 0);
    const totalWithdrawn = transactions
      .filter((entry) => entry.transactionType === 'WITHDRAWAL')
      .reduce((sum, entry) => sum + entry.amount, 0);

    let runningBalance = 0;
    const withBalance = transactions.map((entry) => {
      runningBalance += entry.transactionType === 'DEPOSIT' ? entry.amount : -entry.amount;
      return { ...entry, resultingBalance: runningBalance };
    });

    return {
      _id: doc._id,
      personName: doc.personName,
      personAccountKey: doc.accountKey,
      accountCreatedAt: doc.createdAt,
      notes: doc.notes || '',
      metadata: doc.metadata || '',
      totalDeposited,
      totalWithdrawn,
      currentNetBalance: totalDeposited - totalWithdrawn,
      transactions: withBalance.reverse(),
    };
  }

  async updateCashboxPersonAccount(db, id, body = {}) {
    const accounts = asArray(db['cashbox-person-accounts']);
    const index = accounts.findIndex((account) => account._id === id);
    if (index < 0) return response(null, 404, 'Person account is not found!');

    const current = accounts[index];
    const oldKey = current.accountKey || normalizeAccountKey(current.personName);
    const personName = body.personName !== undefined
      ? String(body.personName).trim().replace(/\s+/g, ' ')
      : current.personName;
    if (!personName) return response(null, 400, 'Person name is required');

    const accountKey = normalizeAccountKey(personName);
    const duplicate = accounts.find(
      (account, accountIndex) => accountIndex !== index
        && (account.accountKey || normalizeAccountKey(account.personName)) === accountKey,
    );
    if (duplicate) return response(null, 400, 'Person account with this name already exists');

    const account = {
      ...current,
      personName,
      accountKey,
      notes: body.notes !== undefined ? String(body.notes || '').trim() : (current.notes || ''),
      metadata: body.metadata !== undefined ? body.metadata : (current.metadata || ''),
      updatedAt: nowIso(),
    };
    accounts[index] = account;
    db['cashbox-person-accounts'] = accounts;

    db['cashbox-transactions'] = asArray(db['cashbox-transactions']).map((tx) => {
      const linked = tx.referenceId === id || String(tx.personAccountKey || '') === String(oldKey);
      if (!linked) return tx;
      return {
        ...tx,
        personName,
        personAccountKey: accountKey,
      };
    });

    await this.persistCollections(db, ['cashbox-person-accounts', 'cashbox-transactions']);
    return response(this.formatCashboxPersonAccount(account), 200, 'Person account updated successfully!');
  }

  async deleteCashboxPersonAccount(db, id) {
    const accounts = asArray(db['cashbox-person-accounts']);
    const account = accounts.find((item) => item._id === id);
    if (!account) return response(null, 404, 'Person account is not found!');

    const accountKey = account.accountKey || normalizeAccountKey(account.personName);
    db['cashbox-person-accounts'] = accounts.filter((item) => item._id !== id);
    db['cashbox-transactions'] = asArray(db['cashbox-transactions']).map((tx) => {
      const linked = tx.referenceId === id || String(tx.personAccountKey || '') === String(accountKey);
      if (!linked) return tx;
      const next = { ...tx, accountDeleted: true };
      delete next.referenceId;
      delete next.personAccountKey;
      return next;
    });

    await this.persistCollections(db, ['cashbox-person-accounts', 'cashbox-transactions']);
    return response(null, 200, 'Person account deleted successfully!');
  }

  cashboxPersonAccountsList(db, params = {}) {
    const search = String(params.search || '').trim().toLowerCase();
    db['cashbox-person-accounts'] = this.mergeDuplicateCashboxPersonAccounts(db['cashbox-person-accounts']);
    let rows = asArray(db['cashbox-person-accounts'])
      .map((doc) => this.formatCashboxPersonAccount(doc))
      .sort((a, b) => a.personName.localeCompare(b.personName));

    if (search) {
      rows = rows.filter((account) =>
        [account.personName, account.personAccountKey]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search))
      );
    }

    return this.paged(rows, { ...params, search: '' });
  }

  getCashboxPersonAccount(db, id) {
    const doc = this.findById(db, 'cashbox-person-accounts', id);
    if (!doc) return response(null, 404, 'Person account is not found!');
    return response(this.formatCashboxPersonAccount(doc));
  }

  async addCashboxPersonAccountTransaction(db, body = {}) {
    const rawName = String(body.personName || '').trim().replace(/\s+/g, ' ');
    const accountKey = normalizeAccountKey(rawName);
    const transactionType = String(body.transactionType || '').trim().toUpperCase();
    const amount = toNumber(body.amount);

    if (!rawName) return response(null, 400, 'Person name is required');
    if (!['DEPOSIT', 'WITHDRAWAL'].includes(transactionType)) return response(null, 400, 'Transaction type is required');
    if (amount <= 0) return response(null, 400, 'Amount must be greater than zero');

    const accounts = this.mergeDuplicateCashboxPersonAccounts(asArray(db['cashbox-person-accounts']));
    db['cashbox-person-accounts'] = accounts;
    const resolveAccountKey = (account) => account.accountKey || normalizeAccountKey(account.personName);
    const existingIndex = accounts.findIndex((account) => resolveAccountKey(account) === accountKey);
    const isNewAccount = existingIndex < 0;
    const canonicalName = isNewAccount ? rawName : accounts[existingIndex].personName;

    const transactionEntry = {
      _id: makeId('person_tx'),
      personName: canonicalName,
      date: body.date || nowIso(),
      amount,
      transactionType,
      reason: body.reason?.trim() || '',
      notes: body.notes?.trim() || body.description?.trim() || '',
      createdAt: nowIso(),
    };

    let account;
    if (isNewAccount) {
      account = {
        _id: makeId('cashbox_person_account'),
        personName: canonicalName,
        accountKey,
        transactions: [transactionEntry],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      accounts.unshift(account);
    } else {
      account = { ...accounts[existingIndex] };
      account.accountKey = accountKey;
      account.transactions = [...asArray(account.transactions), transactionEntry];
      account.updatedAt = nowIso();
      accounts[existingIndex] = account;
    }

    db['cashbox-person-accounts'] = accounts;
    this.addCashbox(
      db,
      transactionType === 'DEPOSIT' ? 'IN' : 'OUT',
      amount,
      transactionType === 'DEPOSIT' ? 'PERSON_DEPOSIT' : 'PERSON_WITHDRAWAL',
      transactionEntry.notes || transactionEntry.reason,
      canonicalName,
      {
        personName: canonicalName,
        personAccountKey: accountKey,
        transactionType,
        referenceId: account._id,
        sourceModule: 'CASHBOX',
        module: 'CASHBOX',
        reason: transactionEntry.reason,
        notes: transactionEntry.notes,
      },
    );
    await this.persistCollections(db, ['cashbox-person-accounts', 'cashbox-transactions']);
    return response(this.formatCashboxPersonAccount(account), 201, 'Person account transaction recorded successfully!');
  }

  expenseDateBoundaries(timeZone) {
    const todayKey = calendarDateKey(new Date(), timeZone);
    const [year, month] = todayKey.split('-').map(Number);
    const todayNoon = new Date(Date.UTC(year, month - 1, Number(todayKey.split('-')[2]), 12));
    const nextDayKey = addCalendarDays(todayKey, 1);
    const weekStartKey = addCalendarDays(todayKey, -((todayNoon.getUTCDay() + 6) % 7));
    const nextWeekStartKey = addCalendarDays(weekStartKey, 7);
    const monthStartKey = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextMonthStartKey = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const yearStartKey = `${year}-01-01`;
    const nextYearStartKey = `${year + 1}-01-01`;

    return {
      todayKey,
      nextDayKey,
      weekStartKey,
      nextWeekStartKey,
      monthStartKey,
      nextMonthStartKey,
      yearStartKey,
      nextYearStartKey,
    };
  }

  expenseSummary(db, params = {}) {
    const timeZone = params.timeZone ? String(params.timeZone) : undefined;
    const {
      todayKey,
      nextDayKey,
      weekStartKey,
      nextWeekStartKey,
      monthStartKey,
      nextMonthStartKey,
      yearStartKey,
      nextYearStartKey,
    } = this.expenseDateBoundaries(timeZone);

    return asArray(db.expenses).reduce((summary, expense) => {
      const amount = toNumber(expense.amount);
      const dateKey = calendarDateKey(expense.date || expense.createdAt, timeZone);
      if (!dateKey) return summary;

      summary.totalExpense += amount;
      if (dateKey >= todayKey && dateKey < nextDayKey) summary.todayExpense += amount;
      if (dateKey >= weekStartKey && dateKey < nextWeekStartKey) summary.weeklyExpense += amount;
      if (dateKey >= monthStartKey && dateKey < nextMonthStartKey) summary.monthlyExpense += amount;
      if (dateKey >= yearStartKey && dateKey < nextYearStartKey) summary.yearlyExpense += amount;
      return summary;
    }, { todayExpense: 0, weeklyExpense: 0, monthlyExpense: 0, yearlyExpense: 0, totalExpense: 0 });
  }

  balance(db, collection, ownerKey, ownerId, positiveType, negativeType) {
    const rows = asArray(db[collection]).filter((row) => String(row[ownerKey]?._id || row[ownerKey]) === String(ownerId));
    const positive = rows.filter((row) => row.type === positiveType).reduce((sum, row) => sum + toNumber(row.amount), 0);
    const negative = rows.filter((row) => row.type === negativeType).reduce((sum, row) => sum + toNumber(row.amount), 0);
    return response({ [positiveType.toLowerCase()]: positive, [negativeType.toLowerCase()]: negative, balance: positive - negative });
  }

  sellerBalance(db, sellerId) {
    const rows = asArray(db['seller-ledgers']).filter((row) => String(row.seller?._id || row.seller) === String(sellerId));
    const purchases = rows.filter((row) => row.type === 'PURCHASE').reduce((sum, row) => sum + toNumber(row.amount), 0);
    const payments = rows.filter((row) => row.type === 'PAYMENT').reduce((sum, row) => sum + toNumber(row.amount), 0);
    return response({ purchases, payments, balance: purchases - payments });
  }

  customerDebtors(db, params = {}) {
    const accounts = new Map();

    asArray(db.sales)
      .filter((sale) => idOf(sale.customer) && toNumber(sale.dueAmount) > 0)
      .forEach((sale) => {
        const customerId = String(idOf(sale.customer));
        const customer = this.findById(db, 'customers', customerId);
        const account = accounts.get(customerId) || {
          _id: customerId,
          customerId,
          customerName: customer?.name || sale.buyerName || 'Customer',
          phone: customer?.phone || '',
          totalDebt: 0,
          totalPaid: 0,
          remainingBalance: 0,
          lastActivityDate: sale.date || sale.createdAt,
          sales: [],
          payments: [],
        };
        const totalAmount = toNumber(sale.totalPrice);
        const paidAmount = toNumber(sale.paidAmount);
        const remainingDebt = toNumber(sale.dueAmount || Math.max(totalAmount - paidAmount, 0));

        account.totalDebt += remainingDebt;
        account.lastActivityDate =
          new Date(account.lastActivityDate || 0) > new Date(sale.date || sale.createdAt || 0)
            ? account.lastActivityDate
            : sale.date || sale.createdAt;
        account.sales.push({
          saleId: sale._id,
          saleDate: sale.date || sale.createdAt,
          invoiceNumber: String(sale.transactionId || sale._id),
          medicineNames: [sale.productName].filter(Boolean),
          quantities: [toNumber(sale.quantity)],
          totalAmount,
          paidAmount,
          remainingDebt,
        });
        accounts.set(customerId, account);
      });

    asArray(db['customer-payments']).forEach((payment) => {
      const customerId = String(idOf(payment.customer));
      const account = accounts.get(customerId);
      if (!account) return;
      const amount = toNumber(payment.amount);
      account.totalPaid += amount;
      account.lastActivityDate =
        new Date(account.lastActivityDate || 0) > new Date(payment.paymentDate || payment.createdAt || 0)
          ? account.lastActivityDate
          : payment.paymentDate || payment.createdAt;
      account.payments.push({
        paymentId: payment._id,
        paymentDate: payment.paymentDate || payment.createdAt,
        amount,
        note: payment.note || '',
      });
    });

    const search = String(params.search || '').toLowerCase();
    let rows = [...accounts.values()].map((account) => ({
      ...account,
      remainingBalance: Math.max(account.totalDebt - account.totalPaid, 0),
    }));

    if (search) {
      rows = rows.filter((account) =>
        [account.customerName, account.phone, ...account.sales.map((sale) => sale.invoiceNumber)]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search))
      );
    }

    rows.sort((a, b) => new Date(b.lastActivityDate || 0) - new Date(a.lastActivityDate || 0));
    return this.paged(rows, { ...params, search: '' });
  }

  groupedSales(db, group) {
    const parseSaleDate = (sale) => {
      const raw = sale.date || sale.createdAt || nowIso();
      if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [year, month, day] = raw.split('-').map(Number);
        return new Date(year, month - 1, day);
      }
      return new Date(raw);
    };

    const getIsoWeekYearAndNumber = (date) => {
      const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      target.setDate(target.getDate() + 4 - (target.getDay() || 7));
      const yearStart = new Date(target.getFullYear(), 0, 1);
      const week = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
      return { year: target.getFullYear(), week };
    };

    const map = new Map();
    asArray(db.sales).forEach((sale) => {
      const date = parseSaleDate(sale);
      if (Number.isNaN(date.getTime())) return;

      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const isoWeek = getIsoWeekYearAndNumber(date);
      const key = group === 'years'
        ? `${year}`
        : group === 'months'
          ? `${year}-${month}`
          : group === 'weeks'
            ? `${isoWeek.year}-${isoWeek.week}`
            : `${year}-${month}-${day}`;

      const previous = map.get(key) || {
        year: group === 'weeks' ? isoWeek.year : year,
        month: group === 'years' ? undefined : month,
        day: group === 'days' ? day : undefined,
        week: group === 'weeks' ? isoWeek.week : undefined,
        totalRevenue: 0,
        totalQuantity: 0,
        totalProfit: 0,
      };
      previous.totalRevenue += toNumber(sale.totalPrice);
      previous.totalQuantity += toNumber(sale.quantity);
      previous.totalProfit += toNumber(sale.profit);
      map.set(key, previous);
    });

    const rows = [...map.values()].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      if ((a.month || 0) !== (b.month || 0)) return (a.month || 0) - (b.month || 0);
      if ((a.week || 0) !== (b.week || 0)) return (a.week || 0) - (b.week || 0);
      return (a.day || 0) - (b.day || 0);
    });

    return response(rows);
  }

  createSale(db, payload) {
    const product = this.findById(db, 'products', idOf(payload.product));
    if (!product) {
      throw new Error('Selected medicine was not found');
    }
    const unitPrice = toNumber(payload.productPrice || payload.price || product?.price || product?.salePrice);
    const quantity = toNumber(payload.quantity);
    if (quantity <= 0) {
      throw new Error('Sale quantity must be greater than zero');
    }
    if (toNumber(product.stock) < quantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }
    const totalPrice = toNumber(payload.totalPrice || unitPrice * quantity);
    const paidAmount = toNumber(payload.paidAmount ?? totalPrice);
    const dueAmount = toNumber(payload.dueAmount ?? Math.max(totalPrice - paidAmount, 0));
    const sale = {
      _id: makeId('sale'),
      ...payload,
      product: product ? { _id: product._id, name: product.name, price: unitPrice } : payload.product,
      productName: payload.productName || product?.name || payload.name || 'Product',
      productPrice: unitPrice,
      quantity,
      totalPrice,
      paidAmount,
      dueAmount,
      profit: totalPrice - (toNumber(product?.purchasePrice || product?.buyPrice) * quantity),
      date: payload.date || todayIso(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    db.sales = [sale, ...asArray(db.sales)];
    if (product) {
      product.stock = Math.max(toNumber(product.stock) - quantity, 0);
      product.updatedAt = nowIso();
    }
    if (dueAmount > 0 && (payload.customer || payload.buyerName) && !payload.transactionId) {
      this.addLedger(db, 'customer-ledgers', { customer: payload.customer, type: 'DEBIT', amount: dueAmount, sale: sale._id, note: `Sale ${sale.productName}` });
      this.syncCreditSaleToDebtorAccount(db, {
        customerId: payload.customer,
        customerName: payload.buyerName,
        buyerName: payload.buyerName,
        date: sale.date || sale.createdAt,
        dueAmount,
        medicinesTaken: `${sale.productName} x${quantity}`,
        saleId: sale._id,
        reason: `Credit sale: ${sale.productName} x${quantity}`,
      });
    } else if (payload.customer && dueAmount > 0) {
      this.addLedger(db, 'customer-ledgers', { customer: payload.customer, type: 'DEBIT', amount: dueAmount, sale: sale._id, note: `Sale ${sale.productName}` });
    }
    if (paidAmount > 0) {
      this.addCashbox(db, 'IN', paidAmount, 'SALE_INCOME', `${sale.productName} x${quantity}`, payload.actor || payload.performedBy || payload.buyerName, {
        sale: sale._id,
        saleNumber: sale.transactionId || sale._id,
        customer: idOf(payload.customer),
        customerName: payload.buyerName,
        saleProfit: sale.profit,
        sourceModule: 'SALES',
        module: 'SALES',
      });
    }
    return sale;
  }

  createSaleReturn(db, body) {
    const sale = this.findById(db, 'sales', body.sale || body.saleId);
    const quantity = toNumber(body.quantity || sale?.quantity);
    const amount = toNumber(body.amount || body.totalPrice || sale?.totalPrice);
    const item = {
      _id: makeId('sale-return'),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...body,
      sale: sale?._id || body.sale,
      productName: body.productName || sale?.productName || sale?.product?.name || '',
      customerName: body.customerName || sale?.buyerName || '',
      quantity,
      amount,
      totalRefund: toNumber(body.totalRefund || amount),
    };

    db['sale-returns'] = [item, ...asArray(db['sale-returns'])];
    const productId = sale?.product?._id || sale?.product || body.product;
    const product = this.findById(db, 'products', productId);
    if (product) {
      product.stock = toNumber(product.stock) + quantity;
      product.updatedAt = nowIso();
    }
    if (amount > 0) {
      this.addCashbox(db, 'OUT', amount, 'SALE_RETURN', sale?.productName || item.reason, body.actor || body.performedBy, {
        saleReturn: item._id,
        sale: sale?._id,
        sourceModule: 'SALES',
        module: 'SALES',
      });
    }
    return item;
  }

  productInstruction(product) {
    return product?.usageInstruction
      || product?.usageInstructions
      || product?.instruction
      || product?.instructions
      || product?.directions
      || product?.description
      || '';
  }

  saleCustomerSnapshot(db, sale, fallbackCustomerId) {
    const customerId = idOf(fallbackCustomerId || sale?.customer);
    const customer = customerId ? this.findById(db, 'customers', customerId) : null;
    const name = customer?.name || sale?.buyerName || '';
    return {
      customerId: customer?._id || customerId || undefined,
      customerName: name,
      customerPhone: customer?.phone || customer?.contactNo || customer?.phoneNumber || '',
    };
  }

  saleSnapshot(sale) {
    if (!sale) return null;
    return {
      _id: sale._id,
      productName: sale.productName,
      buyerName: sale.buyerName,
      customer: idOf(sale.customer),
      transactionId: sale.transactionId,
      paymentType: sale.paymentType,
      paidAmount: toNumber(sale.paidAmount),
      dueAmount: toNumber(sale.dueAmount),
      totalPrice: toNumber(sale.totalPrice),
      date: sale.date || sale.createdAt,
    };
  }

  normalizePrescription(db, body) {
    const sale = this.findById(db, 'sales', body.sale);
    const saleItems = sale?.transactionId
      ? asArray(db.sales).filter((item) => item.transactionId === sale.transactionId)
      : sale ? [sale] : [];
    const saleItemsByProduct = new Map(saleItems.map((item) => [String(idOf(item.product)), item]));
    const customerSnapshot = this.saleCustomerSnapshot(db, sale, body.customer);
    const createdAt = body.createdAt || nowIso();

    const items = asArray(body.items).map((raw) => {
      const productId = idOf(raw.product);
      const product = this.findById(db, 'products', productId);
      const saleLine = saleItemsByProduct.get(String(productId));
      const quantity = toNumber(raw.quantity || saleLine?.quantity || 1);
      const salePrice = toNumber(raw.salePrice || raw.productPrice || saleLine?.productPrice || product?.salePrice || product?.price);
      const productName = raw.productName || raw.medicineName || saleLine?.productName || product?.name || '';
      return {
        ...raw,
        product: product ? { _id: product._id, name: product.name, price: salePrice, stock: product.stock } : productId,
        productId,
        productName,
        medicineName: productName,
        quantity,
        salePrice,
        sellingPrice: salePrice,
        subtotal: toNumber(raw.subtotal || salePrice * quantity),
        dosage: raw.dosage || '',
        instruction: raw.instruction || this.productInstruction(product),
      };
    });

    return {
      _id: body._id || makeId('prescriptions'),
      createdAt,
      updatedAt: nowIso(),
      ...body,
      customer: customerSnapshot.customerId,
      customerName: body.customerName || customerSnapshot.customerName || body.patientName || sale?.buyerName || '',
      customerPhone: body.customerPhone || customerSnapshot.customerPhone || '',
      patientName: body.patientName || customerSnapshot.customerName || sale?.buyerName || '',
      prescriptionDate: body.prescriptionDate || body.date || sale?.date || createdAt,
      sale: sale?._id || body.sale || undefined,
      saleSnapshot: this.saleSnapshot(sale) || body.saleSnapshot,
      items,
      totalAmount: toNumber(body.totalAmount || items.reduce((sum, item) => sum + toNumber(item.subtotal), 0)),
    };
  }

  hydratePrescription(db, prescription) {
    const sale = this.findById(db, 'sales', idOf(prescription.sale));
    const normalized = this.normalizePrescription(db, {
      ...prescription,
      sale: sale?._id || prescription.sale,
      saleSnapshot: prescription.saleSnapshot || this.saleSnapshot(sale),
    });
    return {
      ...normalized,
      sale: sale ? this.saleSnapshot(sale) : null,
      saleDeleted: Boolean(prescription.sale && !sale),
    };
  }

  async handleCreate(db, collection, body) {
    const touched = [collection];

    if (collection === 'products') {
      body.price = toNumber(body.price || body.salePrice || body.price);
      body.salePrice = toNumber(body.salePrice ?? body.price);
      body.purchasePrice = toNumber(body.purchasePrice ?? body.price);
      body.stock = toNumber(body.stock);
      body.minStock = toNumber(body.minStock || 5);
      stripRemovedMedicineFields(body);
    }

    if (collection === 'sales') {
      const sale = this.createSale(db, body);
      await this.persistCollections(db, ['sales', 'products', 'customer-ledgers', 'cashbox-transactions']);
      return response(sale, 201, 'Created successfully');
    }

    if (collection === 'purchases') {
      const product = this.findById(db, 'products', idOf(body.product));
      if (!product) return response(null, 404, 'Selected medicine was not found');
      const sellerId = this.requireSellerForPurchase(db, body.seller || product.seller);
      const seller = this.findById(db, 'sellers', sellerId);
      const quantity = toNumber(body.quantity);
      if (quantity <= 0) return response(null, 400, 'Purchase quantity must be greater than zero');
      const unitPrice = toNumber(body.unitPrice || body.price || product.purchasePrice || product.price);
      const totalPrice = unitPrice * quantity;
      const paid = toNumber(body.paid || body.paidAmount);
      const item = {
        _id: makeId(collection),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        ...body,
        product: product._id,
        productName: body.productName || product.name,
        seller: sellerId,
        sellerName: body.sellerName || seller?.name || '',
        unitPrice,
        quantity,
        paid,
        totalPrice,
        purchaseId: undefined,
        medicineId: undefined,
        medicineName: undefined,
        companyId: undefined,
        companyName: undefined,
        purchasePrice: undefined,
        purchaseDate: undefined,
        paymentStatus: undefined,
        invoiceNumber: body.invoiceNumber || body.invoice || '',
      };
      // normalize/backfill expected field names for other modules
      item.purchaseId = item._id;
      item.medicineId = product._id;
      item.medicineName = item.productName;
      item.companyId = sellerId;
      item.companyName = item.sellerName;
      item.purchasePrice = item.unitPrice;
      item.purchaseDate = body.purchaseDate || item.createdAt;
      item.paymentStatus = this.purchasePaymentStatus(totalPrice, paid);

      db.purchases = [item, ...asArray(db.purchases)];
      product.stock = toNumber(product.stock) + quantity;
      product.updatedAt = nowIso();
      this.syncPurchaseAccounting(db, item, { actor: body.actor || body.performedBy || body.paidBy, productId: product._id });
      await this.persistCollections(db, ['purchases', 'products', 'seller-ledgers', 'cashbox-transactions']);
      return response(item, 201, 'Created successfully');
    }

    if (collection === 'sale-returns') {
      const item = this.createSaleReturn(db, body);
      await this.persistCollections(db, ['sale-returns', 'products', 'cashbox-transactions']);
      return response(item, 201, 'Created successfully');
    }

    if (collection === 'prescriptions') {
      const item = this.normalizePrescription(db, body);
      db.prescriptions = [item, ...asArray(db.prescriptions)];
      await this.persistCollections(db, ['prescriptions']);
      return response(item, 201, 'Created successfully');
    }

    if (collection === 'customer-payments') {
      const amount = toNumber(body.amount);
      if (amount <= 0) return response(null, 400, 'Amount must be greater than zero');
      const customer = this.findById(db, 'customers', idOf(body.customer));
      if (!customer) return response(null, 404, 'Customer is not found');
      const balanceRows = asArray(db['customer-ledgers']).filter((row) => String(row.customer?._id || row.customer) === String(customer._id));
      const debit = balanceRows.filter((row) => row.type === 'DEBIT').reduce((sum, row) => sum + toNumber(row.amount), 0);
      const credit = balanceRows.filter((row) => row.type === 'CREDIT').reduce((sum, row) => sum + toNumber(row.amount), 0);
      if (amount > Math.max(debit - credit, 0) + 0.0001) {
        return response(null, 400, 'Payment cannot exceed customer debt');
      }
      const item = {
        _id: makeId(collection),
        createdAt: nowIso(),
        ...body,
        customer: customer._id,
        amount,
        paymentDate: body.paymentDate || nowIso(),
      };
      db[collection] = [item, ...asArray(db[collection])];
      this.addLedger(db, 'customer-ledgers', { customer: customer._id, type: 'CREDIT', amount, payment: item._id, note: body.note || 'Customer payment' });
      this.addCashbox(db, 'IN', amount, 'DEBT_PAYMENT', body.note, body.actor || body.performedBy || body.receivedBy, {
        customer: customer._id,
        payment: item._id,
        customerName: customer.name,
        sourceModule: 'CUSTOMERS',
        module: 'CUSTOMERS',
      });
      this.applyCustomerDebtorPayment(db, {
        customerId: customer._id,
        customerName: customer.name,
        amount,
        date: item.paymentDate,
        note: body.note,
        customerPaymentId: item._id,
      });
      await this.persistCollections(db, ['customer-payments', 'customer-ledgers', 'cashbox-transactions', 'customer-debtor-accounts']);
      return response(item, 201, 'Created successfully');
    }

    if (collection === 'seller-payments') {
      const amount = toNumber(body.amount);
      if (amount <= 0) return response(null, 400, 'Amount must be greater than zero');
      const sellerId = idOf(body.seller);
      if (!sellerId || !this.findById(db, 'sellers', sellerId)) {
        return response(null, 404, 'Selected company was not found');
      }
      const payableBalance = this.getSellerPayableBalance(db, sellerId);
      if (amount > payableBalance + 0.0001) {
        return response(null, 400, 'Payment cannot exceed seller payable');
      }
      const item = { _id: makeId(collection), createdAt: nowIso(), ...body, seller: sellerId, amount };
      db[collection] = [item, ...asArray(db[collection])];
      this.allocateSellerPaymentToPurchases(db, sellerId, amount);
      this.addCashbox(db, 'OUT', amount, 'COMPANY_DEBT_PAYMENT', body.note, body.actor || body.performedBy || body.paidBy, {
        seller: sellerId,
        payment: item._id,
        companyName: this.findById(db, 'sellers', sellerId)?.name || '',
        sourceModule: 'PURCHASES',
        module: 'PURCHASES',
      });
      this.rebuildSellerLedger(db, sellerId);
      await this.persistCollections(db, ['seller-payments', 'purchases', 'seller-ledgers', 'cashbox-transactions']);
      return response(item, 201, 'Created successfully');
    }

    if (collection === 'salary-payments' || collection === 'expenses') {
      const employee = collection === 'salary-payments' ? this.findById(db, 'employees', idOf(body.employee)) : null;
      if (collection === 'salary-payments' && !employee) return response(null, 404, 'Selected employee was not found');
      if (toNumber(body.amount) <= 0) return response(null, 400, 'Amount must be greater than zero');
      const item = {
        _id: makeId(collection),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        ...body,
        amount: toNumber(body.amount),
        date: normalizeExpenseDate(body.date || todayIso(), body.timeZone),
        ...(employee ? { employee: employee._id, employeeName: employee.name } : {}),
      };
      db[collection] = [item, ...asArray(db[collection])];
      this.addCashbox(db, 'OUT', toNumber(body.amount), collection === 'expenses' ? 'EXPENSE' : 'SALARY_PAYMENT', body.note || item.employeeName, body.actor || body.performedBy || item.employeeName, {
        [collection === 'expenses' ? 'expense' : 'salaryPayment']: item._id,
        expenseType: body.category || body.type || body.expenseType,
        employeeName: item.employeeName,
        sourceModule: collection === 'expenses' ? 'EXPENSES' : 'EMPLOYEES',
        module: collection === 'expenses' ? 'EXPENSES' : 'EMPLOYEES',
      });
      await this.persistCollections(db, [collection, 'cashbox-transactions']);
      return response(item, 201, 'Created successfully');
    }

    if (collection === 'money-transfers') {
      if (toNumber(body.amount) <= 0) return response(null, 400, 'Amount must be greater than zero');
      const item = { _id: makeId(collection), createdAt: nowIso(), ...body, amount: toNumber(body.amount), actor: body.actor || body.performedBy || body.withdrawnBy || 'Manual' };
      db[collection] = [item, ...asArray(db[collection])];
      this.addCashbox(db, 'OUT', toNumber(body.amount), 'TRANSFER', body.note || body.toAccountOrPlace, item.actor, {
        transfer: item._id,
        sourceModule: 'CASHBOX',
        module: 'CASHBOX',
      });
      await this.persistCollections(db, ['money-transfers', 'cashbox-transactions']);
      return response(item, 201, 'Created successfully');
    }

    if (collection === 'cashbox-transactions') {
      const txType = body.transactionType || body.type || 'MANUAL';
      const direction = body.direction
        || (txType === 'DEPOSIT' ? 'IN' : txType === 'WITHDRAWAL' ? 'OUT' : undefined);
      if (!['IN', 'OUT'].includes(direction)) return response(null, 400, 'Cashbox direction is required');
      const amount = toNumber(body.amount);
      if (amount <= 0) return response(null, 400, 'Amount must be greater than zero');

      const createdAt = this.buildCashboxTimestamp(body);
      const reason = String(body.reason || '').trim();
      const notes = String(body.notes || body.note || body.description || '').trim();
      const reference = String(body.reference || body.referenceId || body.relatedCashboxReference || '').trim();
      const operator = (body.actor || body.performedBy || body.personName || 'Manual').trim();
      const normalizedType = ['DEPOSIT', 'WITHDRAWAL'].includes(txType) ? txType : (body.transactionType || body.type || 'MANUAL');

      const tx = this.addCashbox(
        db,
        direction,
        amount,
        normalizedType,
        notes || reason || 'Manual cashbox entry',
        operator,
        {
          personName: body.personName?.trim(),
          sourceModule: body.sourceModule || 'CASHBOX',
          module: body.module || 'CASHBOX',
          relatedCustomer: body.relatedCustomer,
          referenceId: reference || undefined,
          relatedCashboxReference: reference || undefined,
          reason,
          notes,
          note: notes,
          createdAt,
          date: body.date || createdAt.slice(0, 10),
          transactionType: normalizedType,
        },
      );
      this.recalculateCashboxBalances(db);
      await this.persistCollections(db, [collection]);
      return response(tx, 201, 'Cashbox transaction created successfully!');
    }

    if (collection === 'backups') {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const snapshot = JSON.stringify(db);
      const item = {
        _id: makeId('backup'),
        fileName: `pharmacy-backup-${timestamp}.json`,
        filePath: this.dbDir,
        size: snapshot.length,
        payload: snapshot,
        createdAt: nowIso(),
      };
      db.backups = [item, ...asArray(db.backups)];
      await this.persistCollections(db, ['backups']);
      return response(item, 201, 'Backup created');
    }

    const item = { _id: makeId(collection), createdAt: nowIso(), updatedAt: nowIso(), ...body };
    db[collection] = [item, ...asArray(db[collection])];
    await this.persistCollections(db, touched);
    return response(item, 201, 'Created successfully');
  }

  collectionFor(url) {
    const first = url.split('/').filter(Boolean)[0] || '';
    return collectionNames.includes(first) ? first : undefined;
  }

  async request(args) {
    try {
      const request = typeof args === 'string' ? { url: args, method: 'GET' } : args;
      const method = (request.method || 'GET').toUpperCase();
      const url = request.url.replace(/^\/+/, '');
      const parts = url.split('/').filter(Boolean);

      await this.init();

      this.requestLanguage = this.resolveRequestLanguage(request);
      const db = await this.readDb();
      const collection = this.collectionFor(url);

      if (url === 'alerts/dismissed' && method === 'GET') {
        return response(asArray(db['alert-dismissals']));
      }

      if (parts[0] === 'alerts' && parts[1] === 'bulk-delete' && method === 'POST') {
        const ids = asArray(request.body?.ids);
        const dismissals = asArray(request.body?.dismissals);
        const existingKeys = dismissedAlertKeys(db);
        const nextDismissals = dismissals
          .filter((item) => item?.alertKey && !existingKeys.has(item.alertKey))
          .map((item) => ({
            _id: makeId('alert_dismissal'),
            alertKey: item.alertKey,
            type: item.type || 'SYSTEM',
            sourceId: item.sourceId,
            title: item.title,
            dismissedAt: nowIso(),
            createdAt: nowIso(),
            updatedAt: nowIso(),
          }));

        const previousAlertCount = asArray(db.alerts).length;
        db.alerts = asArray(db.alerts).filter((item) => !ids.includes(item._id));
        db['alert-dismissals'] = [...nextDismissals, ...asArray(db['alert-dismissals'])];
        await this.persistCollections(db, ['alerts', 'alert-dismissals']);
        return response({ deleted: previousAlertCount - db.alerts.length, dismissed: nextDismissals.length }, 200, 'Deleted successfully');
      }

      if (url === 'products/total') {
        const products = asArray(db.products);
        const totalQuantity = products.reduce((sum, product) => sum + toNumber(product.stock), 0);
        const inventoryValue = products.reduce((sum, product) => sum + toNumber(product.stock) * toNumber(product.price || product.salePrice), 0);
        return response({ totalProducts: products.length, totalQuantity, inventoryValue });
      }

      if (url === 'products/alerts/low-stock') {
        const dismissed = dismissedAlertKeys(db);
        return response(asArray(db.products).filter((product) => (
          toNumber(product.stock) <= toNumber(product.minStock)
          && !dismissed.has(`LOW_STOCK:${product._id}`)
        )));
      }

      if (url === 'products/alerts/expiring') {
        const days = toNumber(request.params?.days) || 30;
        const now = Date.now();
        const cutoff = now + days * 24 * 60 * 60 * 1000;
        const dismissed = dismissedAlertKeys(db);
        return response(asArray(db.products).filter((product) => {
          if (!product.expireDate) return false;
          const expiry = new Date(product.expireDate).getTime();
          return expiry > now && expiry <= cutoff && !dismissed.has(`EXPIRED_MEDICINE:${product._id}`);
        }));
      }

      if (url === 'cashbox-transactions/summary') return this.cashboxSummary(db);
      if (url === 'cashbox-transactions/person-accounts') return this.cashboxPersonAccountsList(db, request.params);

      if (parts[0] === 'customer-debtor-accounts') {
        if (parts[1] === 'debt' && method === 'POST') {
          return this.addCustomerDebtorDebt(db, request.body || {});
        }
        if (parts[1] === 'payment' && method === 'POST') {
          return this.addCustomerDebtorPayment(db, request.body || {});
        }
        if (parts[1] === 'summary' && method === 'GET') {
          return response(this.customerDebtorSummary(db, request.params));
        }
        if (parts.length === 3 && parts[2] === 'settle' && method === 'POST') {
          return this.settleCustomerDebtorAccount(db, parts[1]);
        }
        if (parts.length === 2 && method === 'GET') {
          return this.getCustomerDebtorAccount(db, parts[1]);
        }
        if (parts.length === 2 && method === 'PATCH') {
          return this.updateCustomerDebtorAccount(db, parts[1], request.body || {});
        }
        if (parts.length === 2 && method === 'DELETE') {
          return this.deleteCustomerDebtorAccount(db, parts[1]);
        }
        if (parts.length === 1 && method === 'GET') {
          return this.customerDebtorAccountsList(db, request.params);
        }
      }

      if (parts[0] === 'cashbox-person-accounts') {
        if (parts[1] === 'transaction' && method === 'POST') {
          return this.addCashboxPersonAccountTransaction(db, request.body || {});
        }
        if (parts.length === 2 && method === 'PATCH') {
          return this.updateCashboxPersonAccount(db, parts[1], request.body || {});
        }
        if (parts.length === 2 && method === 'DELETE') {
          return this.deleteCashboxPersonAccount(db, parts[1]);
        }
        if (parts.length === 2 && method === 'GET') {
          return this.getCashboxPersonAccount(db, parts[1]);
        }
        if (parts.length === 1 && method === 'GET') {
          return this.cashboxPersonAccountsList(db, request.params);
        }
      }

      if (parts[0] === 'purchases' && parts[1] === 'summary' && method === 'GET') {
        return this.purchaseSummary(db, request.params);
      }

      if (parts[0] === 'expenses' && parts[1] === 'summary' && method === 'GET') {
        return response(this.expenseSummary(db, request.params));
      }

      if (parts[0] === 'seller-ledgers' && parts[1] === 'balance' && parts[2]) return this.sellerBalance(db, parts[2]);
      if (parts[0] === 'customers' && parts[1] === 'debtors') return this.customerDebtors(db, request.params);
      if (parts[0] === 'customers' && parts[2] === 'balance') return this.balance(db, 'customer-ledgers', 'customer', parts[1], 'DEBIT', 'CREDIT');
      if (parts[0] === 'sales' && ['days', 'weeks', 'months', 'years'].includes(parts[1])) return this.groupedSales(db, parts[1]);
      if (parts[0] === 'sales' && parts[1] === 'transaction' && parts[2]) {
        return response(asArray(db.sales).filter((sale) => sale.transactionId === parts[2] || sale.transactionId?._id === parts[2]));
      }

      if (parts[0] === 'sales' && parts[1] === 'bulk' && method === 'POST') {
        const transactionId = makeId('transaction');
        const saleItems = Array.isArray(request.body) ? request.body : asArray(request.body?.items);
        if (!saleItems.length) return response(null, 400, 'No medicines selected for sale');

        const lineTotals = saleItems.map((item) => toNumber(item.totalPrice || toNumber(item.productPrice || item.price) * toNumber(item.quantity)));
        const orderTotal = lineTotals.reduce((sum, total) => sum + total, 0);
        let remainingPaid = toNumber(request.body?.paidAmount ?? orderTotal);
        const sales = saleItems.map((item, index) => {
          const isLast = index === saleItems.length - 1;
          const linePaid = isLast ? remainingPaid : Math.min(remainingPaid, Number(((lineTotals[index] / Math.max(orderTotal, 1)) * toNumber(request.body?.paidAmount ?? orderTotal)).toFixed(2)));
          remainingPaid = Math.max(remainingPaid - linePaid, 0);

          return this.createSale(db, {
            ...item,
            transactionId,
            buyerName: request.body?.buyerName,
            date: request.body?.date || todayIso(),
            paymentType: request.body?.paymentType,
            customer: request.body?.customer,
            paidAmount: linePaid,
          });
        });
        const totalDue = sales.reduce((sum, sale) => sum + toNumber(sale.dueAmount), 0);
        if (totalDue > 0 && (request.body?.customer || request.body?.buyerName)) {
          const customer = request.body?.customer ? this.findById(db, 'customers', request.body.customer) : null;
          this.syncCreditSaleToDebtorAccount(db, {
            customerId: customer?._id || request.body?.customer,
            customerName: customer?.name || request.body?.buyerName,
            buyerName: request.body?.buyerName,
            date: request.body?.date || todayIso(),
            dueAmount: totalDue,
            medicinesTaken: sales.map((sale) => `${sale.productName} x${sale.quantity}`).join(', '),
            transactionId,
            reason: `Credit sale (${sales.length} item${sales.length > 1 ? 's' : ''})`,
            notes: request.body?.note || '',
          });
        }
        await this.persistCollections(db, ['sales', 'products', 'customer-ledgers', 'cashbox-transactions', 'customer-debtor-accounts']);
        return response(sales, 201, 'Created successfully');
      }

      if (parts[0] === 'products' && parts[2] === 'add' && method === 'PATCH') {
        const product = this.findById(db, 'products', parts[1]);
        if (!product) return response(null, 404, 'Not found');
        const rawQuantity = request.body?.quantity ?? request.body?.stock;
        if (rawQuantity === undefined || rawQuantity === null || String(rawQuantity).trim() === '') {
          return response(null, 400, 'Stock quantity is required');
        }
        const quantity = toNumber(rawQuantity);
        if (quantity <= 0) return response(null, 400, 'Stock quantity must be greater than zero');
        const sellerId = this.requireSellerForPurchase(db, request.body?.seller || request.body?.companyId || product.seller, {
          companyName: request.body?.companyName || request.body?.sellerName,
          sellerName: request.body?.sellerName || product.sellerName,
        });
        const seller = this.findById(db, 'sellers', sellerId);
        const unitPrice = toNumber(request.body?.unitPrice || request.body?.purchasePrice || product.purchasePrice || product.price);
        const totalPrice = unitPrice * quantity;
        const purchase = {
          _id: makeId('purchases'),
          product: product._id,
          productName: product.name,
          seller: sellerId,
          sellerName: seller?.name || '',
          unitPrice,
          quantity,
          paid: toNumber(request.body?.paid || request.body?.paidAmount),
          totalPrice,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          purchaseId: undefined,
          medicineId: undefined,
          medicineName: undefined,
          companyId: undefined,
          companyName: undefined,
          purchasePrice: undefined,
          purchaseDate: undefined,
          paymentStatus: undefined,
          invoiceNumber: request.body?.invoiceNumber || request.body?.invoice || '',
        };
        purchase.purchaseId = purchase._id;
        purchase.medicineId = product._id;
        purchase.medicineName = product.name;
        purchase.companyId = sellerId;
        purchase.companyName = purchase.sellerName;
        purchase.purchasePrice = purchase.unitPrice;
        purchase.purchaseDate = purchase.createdAt;
        purchase.paymentStatus = purchase.paid >= purchase.totalPrice ? 'PAID' : purchase.paid > 0 ? 'PARTIAL' : 'UNPAID';

        db.purchases = [purchase, ...asArray(db.purchases)];
        product.updatedAt = nowIso();
        product.stock = toNumber(product.stock) + quantity;
        this.syncPurchaseAccounting(db, purchase, { actor: request.body?.actor || request.body?.performedBy || request.body?.paidBy, productId: product._id });
        await this.persistCollections(db, ['products', 'purchases', 'seller-ledgers', 'cashbox-transactions']);
        return response(this.enrichProduct(db, product), 200, 'Updated successfully');
      }

      if (parts[0] === 'products' && parts[1] === 'bulk-delete' && method === 'POST') {
        const ids = asArray(request.body?.ids || request.body);
        db.products = asArray(db.products).filter((item) => !ids.includes(item._id));
        await this.persistCollections(db, ['products']);
        return response(null, 200, 'Deleted successfully');
      }

      if (parts[0] === 'backups' && parts[2] === 'download') {
        const backup = this.findById(db, 'backups', parts[1]);
        return response({ payload: backup?.payload || JSON.stringify(db, null, 2), fileName: backup?.fileName || 'pharmacy-backup.json' });
      }

      if (parts[0] === 'backups' && parts[1] === 'import') {
        return response(null, 404, 'Backup import is not available');
      }

      if (parts[0] === 'backups' && parts[2] === 'restore' && method === 'POST') {
        const backup = this.findById(db, 'backups', parts[1]);
        if (!backup?.payload) return response(null, 404, 'Backup file was not found');

        let snapshot;
        try {
          snapshot = JSON.parse(backup.payload);
        } catch (_error) {
          return response(null, 400, 'Backup file is not valid JSON');
        }

        const restored = {};
        collectionNames.forEach((name) => {
          restored[name] = asArray(snapshot[name]);
        });
        restored.backups = asArray(restored.backups).some((item) => item._id === backup._id)
          ? restored.backups
          : [backup, ...asArray(restored.backups)];

        await Promise.all(collectionNames.map((name) => this.replaceCollection(name, restored[name])));
        await this.seedDefaults();
        return response({ restoredCollections: collectionNames.length }, 200, 'Backup restored successfully');
      }

      if (!collection) return response(null, 404, 'Offline route not found');

      if (method === 'GET') {
        const id = parts[1];
        const rows = collection === 'products'
          ? asArray(db.products).map((product) => this.enrichProduct(db, product))
          : asArray(db[collection]).map((item) => {
            if (collection === 'sale-returns') {
              const sale = this.findById(db, 'sales', item.sale);
              return {
                ...item,
                sale: sale ? { _id: sale._id, productName: sale.productName, buyerName: sale.buyerName } : item.sale,
                productName: item.productName || sale?.productName || sale?.product?.name || '',
                customerName: item.customerName || sale?.buyerName || '',
                quantity: toNumber(item.quantity || asArray(item.items).reduce((sum, row) => sum + toNumber(row.quantity), 0)),
                totalRefund: toNumber(item.totalRefund || item.amount),
              };
            }
            if (collection === 'prescriptions') return this.hydratePrescription(db, item);
            return item;
          });
        if (collection === 'expenses') {
          if (id && id !== 'summary') return response(rows.find((item) => item._id === id) || null);
          const result = this.paged(rows, request.params);
          return { ...result, summary: this.expenseSummary(db, request.params) };
        }

        if (collection === 'purchases') {
          const filtered = this.filterPurchases(db, request.params);
          if (id && id !== 'summary') return response(filtered.find((item) => item._id === id) || null);
          const result = this.paged(filtered, request.params);
          return { ...result, summary: this.purchaseSummary(db, request.params).data };
        }

        if (collection === 'cashbox-transactions') {
          const enriched = this.filterCashboxTransactions(this.enrichCashboxTransactions(db), request.params);
          if (id && id !== 'summary' && id !== 'person-accounts') {
            return response(enriched.find((item) => item._id === id) || null);
          }
          return this.paged(enriched, request.params);
        }

        if (id) return response(rows.find((item) => item._id === id) || null);
        const result = this.paged(rows, request.params);
        return result;
      }

      if (method === 'POST') return this.handleCreate(db, collection, request.body || {});

      if (method === 'PATCH') {
        if (collection === 'cashbox-transactions') {
          const result = this.updateCashboxTransaction(db, parts[1], request.body || {});
          if (!result.success) return result;
          await this.persistCollections(db, ['cashbox-transactions']);
          return result;
        }

        const item = this.findById(db, collection, parts[1]);
        if (!item) return response(null, 404, 'Not found');
        if (collection === 'purchases') {
          const previousQuantity = toNumber(item.quantity);
          const previousProduct = this.findById(db, 'products', item.product);
          const nextProduct = this.findById(db, 'products', idOf(request.body?.product || item.product));
          if (!nextProduct) return response(null, 404, 'Selected medicine was not found');
          const sellerId = this.requireSellerForPurchase(db, request.body?.seller || item.seller || nextProduct.seller);
          const quantity = toNumber(request.body?.quantity ?? item.quantity);
          const unitPrice = toNumber(request.body?.unitPrice || request.body?.price || item.unitPrice || nextProduct.purchasePrice || nextProduct.price);
          const paid = toNumber(request.body?.paid ?? request.body?.paidAmount ?? item.paid);
          if (previousProduct && previousProduct._id !== nextProduct._id) {
            previousProduct.stock = Math.max(toNumber(previousProduct.stock) - previousQuantity, 0);
            previousProduct.updatedAt = nowIso();
            nextProduct.stock = toNumber(nextProduct.stock) + quantity;
          } else {
            nextProduct.stock = Math.max(toNumber(nextProduct.stock) - previousQuantity, 0) + quantity;
          }
          nextProduct.updatedAt = nowIso();
          const previousSeller = item.seller;
          Object.assign(item, request.body || {}, {
            product: nextProduct._id,
            productName: request.body?.productName || nextProduct.name,
            seller: sellerId,
            quantity,
            unitPrice,
            totalPrice: unitPrice * quantity,
            paid,
            updatedAt: nowIso(),
          });
          const seller = this.findById(db, 'sellers', item.seller);
          item.sellerName = request.body?.sellerName || seller?.name || item.sellerName || '';
          // keep compatibility fields in sync
          item.purchaseId = item._id;
          item.medicineId = item.product;
          item.medicineName = item.productName;
          item.companyId = item.seller;
          item.companyName = item.sellerName;
          item.purchasePrice = item.unitPrice;
          item.purchaseDate = item.updatedAt;
          item.paymentStatus = item.paid >= item.totalPrice ? 'PAID' : item.paid > 0 ? 'PARTIAL' : 'UNPAID';
          this.syncPurchaseAccounting(db, item, { actor: request.body?.actor || request.body?.performedBy || request.body?.paidBy, productId: item.product });
          if (previousSeller && String(previousSeller) !== String(item.seller)) {
            try {
              this.rebuildSellerLedger(db, previousSeller);
            } catch (e) {
              log.error('Failed to rebuild seller ledger for previous seller on purchase update', e);
            }
          }
          await this.persistCollections(db, ['purchases', 'products', 'seller-ledgers', 'cashbox-transactions']);
          return response(item, 200, 'Updated successfully');
        }

        const previousSeller = collection === 'seller-payments' ? item.seller : null;
        Object.assign(item, request.body || {}, { updatedAt: nowIso() });
        if (collection === 'products') {
          item.price = toNumber(item.price || item.salePrice);
          item.salePrice = toNumber(item.salePrice ?? item.price);
          item.purchasePrice = toNumber(item.purchasePrice ?? item.price);
          item.stock = toNumber(item.stock);
          item.minStock = toNumber(item.minStock || 5);
          stripRemovedMedicineFields(item);
        }
        // If a seller payment was updated, rebuild its seller ledger
        if (collection === 'seller-payments') {
          try {
            this.rebuildSellerLedger(db, item.seller);
            if (previousSeller && String(previousSeller) !== String(item.seller)) {
              this.rebuildSellerLedger(db, previousSeller);
            }
          } catch (e) {
            log.error('Failed to rebuild seller ledger on payment update', e);
          }
        }
        await this.persistCollections(db, [collection, ...(collection === 'seller-payments' ? ['seller-ledgers'] : [])]);
        return response(item, 200, 'Updated successfully');
      }

      if (method === 'DELETE') {
        if (collection === 'cashbox-transactions') {
          const result = this.deleteCashboxTransaction(db, parts[1]);
          if (!result.success) return result;
          await this.persistCollections(db, ['cashbox-transactions']);
          return result;
        }

        if (collection === 'sales') {
          const sale = this.findById(db, 'sales', parts[1]);
          const productId = sale?.product?._id || sale?.product;
          const product = this.findById(db, 'products', productId);
          if (sale && product) {
            product.stock = toNumber(product.stock) + toNumber(sale.quantity);
            product.updatedAt = nowIso();
          }
          db.sales = asArray(db.sales).filter((item) => item._id !== parts[1]);
          db.prescriptions = asArray(db.prescriptions).map((prescription) => {
            if (idOf(prescription.sale) !== parts[1]) return prescription;
            return {
              ...this.normalizePrescription(db, { ...prescription, sale: undefined, saleSnapshot: prescription.saleSnapshot || this.saleSnapshot(sale) }),
              sale: undefined,
              linkedSaleDeleted: true,
              updatedAt: nowIso(),
            };
          });
          await this.persistCollections(db, ['sales', 'products', 'prescriptions']);
          return response(null, 200, 'Deleted successfully');
        }

        if (collection === 'purchases') {
          const purchase = this.findById(db, 'purchases', parts[1]);
          const product = this.findById(db, 'products', purchase?.product);
          if (purchase && product) {
            product.stock = Math.max(toNumber(product.stock) - toNumber(purchase.quantity), 0);
            product.updatedAt = nowIso();
          }
          db.purchases = asArray(db.purchases).filter((item) => item._id !== parts[1]);
          this.removePurchaseAccounting(db, parts[1]);
          // Rebuild ledger for the affected seller
          try {
            if (purchase?.seller) this.rebuildSellerLedger(db, purchase.seller);
          } catch (e) {
            log.error('Failed to rebuild seller ledger on purchase delete', e);
          }
          await this.persistCollections(db, ['purchases', 'products', 'seller-ledgers', 'cashbox-transactions']);
          return response(null, 200, 'Deleted successfully');
        }

        if (collection === 'sale-returns') {
          const saleReturn = this.findById(db, 'sale-returns', parts[1]);
          const sale = this.findById(db, 'sales', saleReturn?.sale);
          const productId = sale?.product?._id || sale?.product || saleReturn?.product;
          const product = this.findById(db, 'products', productId);
          if (saleReturn && product) {
            product.stock = Math.max(toNumber(product.stock) - toNumber(saleReturn.quantity), 0);
            product.updatedAt = nowIso();
          }
          db['sale-returns'] = asArray(db['sale-returns']).filter((item) => item._id !== parts[1]);
          await this.persistCollections(db, ['sale-returns', 'products']);
          return response(null, 200, 'Deleted successfully');
        }

        const removed = this.findById(db, collection, parts[1]);
        db[collection] = asArray(db[collection]).filter((item) => item._id !== parts[1]);
        if (collection === 'seller-payments' && removed?.seller) {
          try {
            this.rebuildSellerLedger(db, removed.seller);
          } catch (e) {
            log.error('Failed to rebuild seller ledger on payment delete', e);
          }
        }
        await this.persistCollections(db, [collection, ...(collection === 'seller-payments' ? ['seller-ledgers'] : [])]);
        return response(null, 200, 'Deleted successfully');
      }

      return response(null, 405, 'Unsupported offline method');
    } catch (error) {
      log.error('Local repository request failed', error);
      return response(null, error.statusCode || 500, error.message || 'Local database error');
    }
  }
}

module.exports = {
  LocalRepository,
};
