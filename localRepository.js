'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Datastore = require('@seald-io/nedb');
const log = require('electron-log');

const ADMIN_EMAIL = 'admin@pharmacy.local';
const ADMIN_PASSWORD = 'Admin12345';
const ADMIN_ID = 'local-admin-user';
const TOKEN = 'local-admin-session-token';

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
  'backups',
  'users',
];

const nowIso = () => new Date().toISOString();
const todayIso = () => new Date().toISOString().slice(0, 10);
const makeId = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
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

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 100000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.pbkdf2Sync(String(password), salt, 100000, 32, 'sha256').toString('hex');
  const storedHash = Buffer.from(hash, 'hex');
  const candidateHash = Buffer.from(candidate, 'hex');
  return storedHash.length === candidateHash.length && crypto.timingSafeEqual(storedHash, candidateHash);
}

function publicUser(user) {
  if (!user) return user;
  const { password, passwordHash, ...safeUser } = user;
  return safeUser;
}

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
    await this.ensureDefaultAdmin();
    await this.insertDefault('sellers', { _id: 'seller_default', name: 'Default Supplier', email: 'supplier@pharmacy.local', contactNo: '0000000000' });
  }

  defaultAdminUser() {
    return {
      _id: ADMIN_ID,
      email: ADMIN_EMAIL,
      passwordHash: hashPassword(ADMIN_PASSWORD, 'pharmacy-local-admin-v1'),
      name: 'Pharmacy Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      iat: 0,
      exp: 4102444800,
      updatedAt: nowIso(),
    };
  }

  async ensureDefaultAdmin() {
    log.info('ensureDefaultAdmin started');
    const users = this.collections.users;
    try {
      const existingAdmin = await users.findOneAsync({ email: ADMIN_EMAIL });
      if (existingAdmin) {
        log.info('Admin found', { email: existingAdmin.email, _id: existingAdmin._id });
      } else {
        const adminUser = this.defaultAdminUser();
        log.info('Admin not found, inserting default admin', { email: adminUser.email });
        await users.insertAsync({ ...adminUser, createdAt: nowIso() });
        log.info('Admin inserted', { email: adminUser.email });
      }
    } catch (error) {
      log.error('Insert failed', error);
      throw error;
    }
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

  paged(data, params = {}) {
    const search = String(params.search || '').toLowerCase();
    const filteredBySearch = search
      ? data.filter((item) => JSON.stringify(item).toLowerCase().includes(search))
      : data;
    const filtered = filteredBySearch.filter((item) => Object.entries(params).every(([key, value]) => {
      if (['page', 'limit', 'search'].includes(key)) return true;
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

    payments.forEach((pay) => {
      const amt = toNumber(pay.amount);
      if (amt <= 0) return;
      rebuilt.push({ _id: makeId('seller-ledgers'), createdAt: pay.createdAt || nowIso(), seller: sid, type: 'PAYMENT', amount: amt, debit: 0, credit: amt, payment: pay._id, description: pay.note || 'Seller payment' });
    });

    // newest first like addLedger does
    db['seller-ledgers'] = [...rebuilt.reverse(), ...other];
  }

  requireSellerForPurchase(db, sellerValue) {
    const sellerId = idOf(sellerValue);
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
      });
    }

    // Rebuild seller ledger deterministically from purchases + seller-payments
    this.rebuildSellerLedger(db, sellerId);

    return purchase;
  }

  addCashbox(db, direction, amount, source, note, actor, extra = {}) {
    db['cashbox-transactions'] = [{
      _id: makeId('cashbox'),
      type: source,
      direction,
      amount,
      source,
      sourceModule: source,
      note,
      description: note,
      actor: actor || 'System',
      performedBy: actor || 'System',
      createdAt: nowIso(),
      date: todayIso(),
      ...extra,
    }, ...asArray(db['cashbox-transactions'])];
  }

  cashboxSummary(db) {
    const rows = asArray(db['cashbox-transactions']);
    const cashIn = rows.filter((row) => row.direction === 'IN').reduce((sum, row) => sum + toNumber(row.amount), 0);
    const cashOut = rows.filter((row) => row.direction === 'OUT').reduce((sum, row) => sum + toNumber(row.amount), 0);
    return response({ cashIn, cashOut, balance: cashIn - cashOut });
  }

  cashboxPersonAccounts(db) {
    const accounts = new Map();
    asArray(db['cashbox-transactions'])
      .filter((row) => ['DEPOSIT', 'WITHDRAWAL'].includes(row.transactionType || row.type))
      .sort((a, b) => new Date(a.createdAt || a.date || 0).getTime() - new Date(b.createdAt || b.date || 0).getTime())
      .forEach((row) => {
        const personName = String(row.actor || row.performedBy || row.personName || '').trim();
        const transactionType = row.transactionType || row.type;
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
          relatedCustomer: row.relatedCustomer,
          relatedCashboxReference: row.relatedCashboxReference || row.referenceId || row._id,
        });
        accounts.set(personName, existing);
      });

    const data = Array.from(accounts.values()).map((account) => ({
      ...account,
      transactions: account.transactions.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()),
    })).sort((a, b) => a.personName.localeCompare(b.personName));
    return response(data);
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

  groupedSales(db, group) {
    const map = new Map();
    asArray(db.sales).forEach((sale) => {
      const date = new Date(sale.date || sale.createdAt || nowIso());
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const week = Math.ceil(day / 7);
      const key = group === 'years' ? `${year}` : group === 'months' ? `${year}-${month}` : group === 'weeks' ? `${year}-${month}-${week}` : `${year}-${month}-${day}`;
      const previous = map.get(key) || { year, month, week, day, totalRevenue: 0, totalQuantity: 0, totalProfit: 0 };
      previous.totalRevenue += toNumber(sale.totalPrice);
      previous.totalQuantity += toNumber(sale.quantity);
      previous.totalProfit += toNumber(sale.profit);
      map.set(key, previous);
    });
    return response([...map.values()]);
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
    if (payload.customer && dueAmount > 0) {
      this.addLedger(db, 'customer-ledgers', { customer: payload.customer, type: 'DEBIT', amount: dueAmount, sale: sale._id, note: `Sale ${sale.productName}` });
    }
    if (paidAmount > 0) {
        this.addCashbox(db, 'IN', paidAmount, 'SALE', sale.productName, payload.actor || payload.performedBy || payload.buyerName, { sale: sale._id });
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
        this.addCashbox(db, 'OUT', amount, 'SALE_RETURN', sale?.productName || item.reason, body.actor || body.performedBy, { saleReturn: item._id, sale: sale?._id });
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

  async login(body) {
    const email = String(body.email || '').trim().toLowerCase();
    const password = body.password;
    log.info('Login email:', email);

    let normalLoginFailed = false;
    let normalLoginError = null;

    try {
      if (!this.initialized) {
        await this.init();
      }
      await this.ensureDefaultAdmin();

      log.info('users.db:', fs.existsSync(path.join(this.dbDir, 'users.db')));
      log.info('initialized:', this.initialized);

      if (!fs.existsSync(this.dbDir)) {
        log.error('embedded-db folder unavailable', { dbDir: this.dbDir });
        normalLoginFailed = true;
        normalLoginError = 'embedded-db folder unavailable';
        throw new Error(normalLoginError);
      }

      const usersDbExists = fs.existsSync(path.join(this.dbDir, 'users.db'));
      if (!usersDbExists) {
        log.info('users.db missing');
        log.error('users.db missing', { usersDb: path.join(this.dbDir, 'users.db') });
        normalLoginFailed = true;
        normalLoginError = 'users.db creation failed';
        throw new Error(normalLoginError);
      }

      if (!this.initialized) {
        log.error('Database failed to initialize');
        normalLoginFailed = true;
        normalLoginError = 'Database failed to initialize';
        throw new Error(normalLoginError);
      }

      const users = await this.collections.users.findAsync({});
      log.info('Current users count:', users.length);
      if (!users.length) {
        log.error('users count is zero');
        normalLoginFailed = true;
        normalLoginError = 'users count is zero';
        throw new Error(normalLoginError);
      }

      const adminUser = await this.collections.users.findOneAsync({ email: ADMIN_EMAIL });
      if (!adminUser) {
        log.error('default admin missing');
        normalLoginFailed = true;
        normalLoginError = 'default admin missing';
        throw new Error(normalLoginError);
      }

      const user = await this.collections.users.findOneAsync({ email });
      let passwordVerified = false;
      try {
        passwordVerified = user && user.status !== 'BLOCKED' && verifyPassword(password, user.passwordHash);
      } catch (verifyError) {
        log.error('verifyPassword threw error', verifyError);
        normalLoginFailed = true;
        normalLoginError = 'verifyPassword error';
        throw verifyError;
      }

      log.info('Password verification:', !!passwordVerified, { userFound: !!user, userStatus: user?.status });
      if (passwordVerified) {
        return response({ token: TOKEN, user: publicUser(user) }, 200, 'User login successfully!');
      }

      normalLoginFailed = true;
      normalLoginError = 'Invalid credentials';
    } catch (error) {
      log.info('Normal login failed', { error: normalLoginError || (error && error.message) });
    }

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      log.info('Emergency bootstrap activated');
      const emergencyAdmin = {
        _id: ADMIN_ID,
        email: ADMIN_EMAIL,
        name: 'Pharmacy Admin',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        iat: 0,
        exp: 4102444800,
      };
      return response({ token: TOKEN, user: emergencyAdmin }, 200, 'Emergency admin bootstrap success');
    }

    log.info('Login failed with invalid credentials');
    return response(null, 401, 'Invalid email or password');
  }

  async changePassword(body) {
    const user = await this.collections.users.findOneAsync({ _id: 'local-admin-user' });
    if (!user || !verifyPassword(body.oldPassword, user.passwordHash)) {
      return response(null, 401, 'Old password is incorrect');
    }
    if (!body.newPassword || body.newPassword !== body.confirmPassword) {
      return response(null, 400, 'New password confirmation does not match');
    }

    await this.collections.users.updateAsync(
      { _id: 'local-admin-user' },
      { $set: { passwordHash: hashPassword(body.newPassword), updatedAt: nowIso() } },
      {},
    );
    const updatedUser = await this.collections.users.findOneAsync({ _id: 'local-admin-user' });
    return response(publicUser(updatedUser), 200, 'Password updated locally');
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
      item.purchaseDate = item.createdAt;
      item.paymentStatus = paid >= totalPrice ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID';

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
      if (toNumber(body.amount) <= 0) return response(null, 400, 'Amount must be greater than zero');
      const item = { _id: makeId(collection), createdAt: nowIso(), ...body };
      db[collection] = [item, ...asArray(db[collection])];
      this.addLedger(db, 'customer-ledgers', { customer: body.customer, type: 'CREDIT', amount: toNumber(body.amount), payment: item._id });
      this.addCashbox(db, 'IN', toNumber(body.amount), 'CUSTOMER_PAYMENT', body.note, body.actor || body.performedBy || body.receivedBy, { customer: body.customer, payment: item._id });
      await this.persistCollections(db, ['customer-payments', 'customer-ledgers', 'cashbox-transactions']);
      return response(item, 201, 'Created successfully');
    }

    if (collection === 'seller-payments') {
      if (toNumber(body.amount) <= 0) return response(null, 400, 'Amount must be greater than zero');
      const item = { _id: makeId(collection), createdAt: nowIso(), ...body };
      db[collection] = [item, ...asArray(db[collection])];
      this.addCashbox(db, 'OUT', toNumber(body.amount), 'SELLER_PAYMENT', body.note, body.actor || body.performedBy || body.paidBy, { seller: body.seller, payment: item._id });
      // Rebuild the seller ledger from authoritative sources
      this.rebuildSellerLedger(db, body.seller);
      await this.persistCollections(db, ['seller-payments', 'seller-ledgers', 'cashbox-transactions']);
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
        ...(employee ? { employee: employee._id, employeeName: employee.name } : {}),
      };
      db[collection] = [item, ...asArray(db[collection])];
      this.addCashbox(db, 'OUT', toNumber(body.amount), collection === 'expenses' ? 'EXPENSE' : 'SALARY', body.note || item.employeeName, body.actor || body.performedBy || item.employeeName, { [collection === 'expenses' ? 'expense' : 'salaryPayment']: item._id });
      await this.persistCollections(db, [collection, 'cashbox-transactions']);
      return response(item, 201, 'Created successfully');
    }

    if (collection === 'money-transfers') {
      if (toNumber(body.amount) <= 0) return response(null, 400, 'Amount must be greater than zero');
      const item = { _id: makeId(collection), createdAt: nowIso(), ...body, amount: toNumber(body.amount), actor: body.actor || body.performedBy || body.withdrawnBy || 'Manual' };
      db[collection] = [item, ...asArray(db[collection])];
      this.addCashbox(db, 'OUT', toNumber(body.amount), 'TRANSFER', body.note || body.toAccountOrPlace, item.actor, { transfer: item._id });
      await this.persistCollections(db, ['money-transfers', 'cashbox-transactions']);
      return response(item, 201, 'Created successfully');
    }

    if (collection === 'cashbox-transactions') {
      const transactionType = body.transactionType || (['DEPOSIT', 'WITHDRAWAL'].includes(body.type) ? body.type : undefined);
      const operator = (body.actor || body.performedBy || body.personName || '').trim();
      const item = {
        _id: makeId('cashbox'),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        date: body.date || todayIso(),
        type: body.type || 'MANUAL',
        direction: body.direction,
        amount: toNumber(body.amount),
        personName: transactionType ? operator : body.personName?.trim(),
        transactionType,
        source: body.sourceModule || (transactionType ? 'OPERATOR_ACCOUNT' : body.type || 'MANUAL'),
        sourceModule: body.sourceModule || (transactionType ? 'OPERATOR_ACCOUNT' : body.type || 'MANUAL'),
        description: body.description || body.note,
        note: body.note || body.description,
        actor: operator || 'Manual',
        performedBy: operator || 'Manual',
        relatedCustomer: body.relatedCustomer,
        relatedCashboxReference: body.relatedCashboxReference || body.referenceId,
      };
      if (item.transactionType === 'DEPOSIT') item.direction = 'IN';
      if (item.transactionType === 'WITHDRAWAL') item.direction = 'OUT';
      if (!['IN', 'OUT'].includes(item.direction)) return response(null, 400, 'Cashbox direction is required');
      if (item.amount <= 0) return response(null, 400, 'Amount must be greater than zero');
      if (item.transactionType && !operator) return response(null, 400, 'Operator is required');
      db[collection] = [item, ...asArray(db[collection])];
      await this.persistCollections(db, [collection]);
      return response(item, 201, 'Created successfully');
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

    if (collection === 'users') {
      const item = {
        _id: makeId(collection),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        ...body,
        email: String(body.email || '').trim().toLowerCase(),
        passwordHash: hashPassword(body.password || ADMIN_PASSWORD),
      };
      delete item.password;
      db.users = [item, ...asArray(db.users)];
      await this.persistCollections(db, ['users']);
      return response(publicUser(item), 201, 'Created successfully');
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

      if (url === 'auth/login' && method === 'POST') return this.login(request.body || {});

      await this.init();
      if (url === 'auth/change-password' && method === 'POST') return this.changePassword(request.body || {});
      if (url === 'auth/me') {
        const admin = await this.collections.users.findOneAsync({ email: ADMIN_EMAIL });
        return response(publicUser(admin));
      }

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
        const cutoff = Date.now() + days * 24 * 60 * 60 * 1000;
        const dismissed = dismissedAlertKeys(db);
        return response(asArray(db.products).filter((product) => (
          product.expireDate
          && new Date(product.expireDate).getTime() <= cutoff
          && !dismissed.has(`EXPIRED_MEDICINE:${product._id}`)
        )));
      }

      if (url === 'cashbox-transactions/summary') return this.cashboxSummary(db);
      if (url === 'cashbox-transactions/person-accounts') return this.cashboxPersonAccounts(db);
      if (parts[0] === 'seller-ledgers' && parts[1] === 'balance' && parts[2]) return this.sellerBalance(db, parts[2]);
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
        await this.persistCollections(db, ['sales', 'products', 'customer-ledgers', 'cashbox-transactions']);
        return response(sales, 201, 'Created successfully');
      }

      if (parts[0] === 'products' && parts[2] === 'add' && method === 'PATCH') {
        const product = this.findById(db, 'products', parts[1]);
        if (!product) return response(null, 404, 'Not found');
        const quantity = toNumber(request.body?.quantity ?? request.body?.stock);
        if (quantity <= 0) return response(null, 400, 'Stock quantity must be greater than zero');
        const sellerId = this.requireSellerForPurchase(db, request.body?.seller || product.seller);
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
            if (collection === 'users') return publicUser(item);
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
        return id ? response(rows.find((item) => item._id === id) || null) : this.paged(rows, request.params);
      }

      if (method === 'POST') return this.handleCreate(db, collection, request.body || {});

      if (method === 'PATCH') {
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
        if (collection === 'users' && request.body?.password) {
          item.passwordHash = hashPassword(request.body.password);
          delete item.password;
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
        return response(collection === 'users' ? publicUser(item) : item, 200, 'Updated successfully');
      }

      if (method === 'DELETE') {
        if (collection === 'cashbox-transactions') {
          return response(null, 405, 'Cashbox history cannot be deleted');
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
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  TOKEN,
};
