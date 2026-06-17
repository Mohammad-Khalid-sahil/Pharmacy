import { z } from 'zod';

const createSchema = z.object({
  name: z.string(),
  barcode: z.string().optional(),
  seller: z.string(),
  price: z.number().min(1, { message: 'Must be grater than 1!' }),
  purchasePrice: z.number().min(0).optional(),
  salePrice: z.number().min(0).optional(),
  stock: z.number().min(1, { message: 'Must be grater than 1!' })
    ,
  minStock: z.number().min(0).optional(),
  expireDate: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional()
});

const updateSchema = z.object({
  name: z.string().optional(),
  barcode: z.string().optional(),
  seller: z.string().optional(),
  price: z.number().min(1, { message: 'Must be grater than 1!' }).optional(),
  purchasePrice: z.number().min(0).optional(),
  salePrice: z.number().min(0).optional(),
  stock: z.number().min(1, { message: 'Must be grater than 1!' }).optional()
    ,
  minStock: z.number().min(0).optional(),
  expireDate: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional()
});

const addStockSchema = z.object({
  stock: z.number().min(1, { message: 'Must be grater than 1!' })
});

const productValidator = { createSchema, updateSchema, addStockSchema };
export default productValidator;
