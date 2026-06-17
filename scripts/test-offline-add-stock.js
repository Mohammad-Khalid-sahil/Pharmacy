'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { LocalRepository } = require('../electron/localRepository');

async function run() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pharmacy-offline-stock-'));
  const repo = new LocalRepository(tempDir);
  await repo.init();

  const seller = await repo.request({
    url: '/sellers',
    method: 'POST',
    body: { name: 'ABC Pharma', email: 'abc@test.local', contactNo: '700000001' },
  });
  if (!seller.success) throw new Error(`Seller create failed: ${seller.message}`);

  const product = await repo.request({
    url: '/products',
    method: 'POST',
    body: {
      name: 'Panadol',
      barcode: 'PAN-001',
      price: 10,
      purchasePrice: 5,
      stock: 0,
      minStock: 5,
      seller: seller.data._id,
    },
  });
  if (!product.success) throw new Error(`Product create failed: ${product.message}`);

  const quantities = [1, 5, 10, 100, 500, '۱۰', '۵۰۰'];
  let expectedStock = 0;
  for (const qty of quantities) {
    const add = await repo.request({
      url: `/products/${product.data._id}/add`,
      method: 'PATCH',
      body: { stock: qty, seller: seller.data._id },
    });
    if (!add.success) throw new Error(`Add stock ${qty} failed: ${add.message}`);
    expectedStock += Number(String(qty).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    if (Number(add.data.stock) !== expectedStock) {
      throw new Error(`Stock mismatch after ${qty}: expected ${expectedStock}, got ${add.data.stock}`);
    }
  }

  const rejectZero = await repo.request({
    url: `/products/${product.data._id}/add`,
    method: 'PATCH',
    body: { stock: 0 },
  });
  const rejectEmpty = await repo.request({
    url: `/products/${product.data._id}/add`,
    method: 'PATCH',
    body: { stock: '' },
  });

  const legacyProduct = await repo.request({
    url: '/products',
    method: 'POST',
    body: {
      name: 'LegacyMed',
      barcode: 'LEG-001',
      price: 12,
      purchasePrice: 6,
      stock: 0,
      minStock: 5,
      seller: 'ABC Pharma',
    },
  });
  if (!legacyProduct.success) throw new Error(`Legacy product create failed: ${legacyProduct.message}`);

  const legacyAdd = await repo.request({
    url: `/products/${legacyProduct.data._id}/add`,
    method: 'PATCH',
    body: { stock: 25, seller: seller.data._id },
  });
  if (!legacyAdd.success) throw new Error(`Legacy add stock failed: ${legacyAdd.message}`);
  if (Number(legacyAdd.data.stock) !== 25) {
    throw new Error(`Legacy stock mismatch: expected 25, got ${legacyAdd.data.stock}`);
  }

  const legacyAddByName = await repo.request({
    url: `/products/${legacyProduct.data._id}/add`,
    method: 'PATCH',
    body: { stock: 5, seller: 'ABC Pharma' },
  });
  if (!legacyAddByName.success) throw new Error(`Legacy add stock by name failed: ${legacyAddByName.message}`);

  const restart = new LocalRepository(tempDir);
  await restart.init();
  const afterRestart = await restart.request({
    url: `/products/${product.data._id}`,
    method: 'GET',
  });

  const passed =
    expectedStock === 1126 &&
    !rejectZero.success &&
    rejectZero.message === 'Stock quantity must be greater than zero' &&
    !rejectEmpty.success &&
    afterRestart.data.stock === 1126;

  console.log(passed ? 'ALL OFFLINE ADD STOCK TESTS PASSED' : 'TESTS FAILED');
  console.log('Final stock:', afterRestart.data.stock);
  fs.rmSync(tempDir, { recursive: true, force: true });
  process.exit(passed ? 0 : 1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
