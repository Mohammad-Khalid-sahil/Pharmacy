import { z } from 'zod';

const createSchema = z.object({
  product: z.string(),
  productName: z.string(),
  quantity: z.number().min(1, { message: 'Must be equal or grater than 1' }),
  productPrice: z.number().min(1, { message: 'Must be equal or grater than 1' }),
  buyerName: z.string(),
  date: z.string(),
  paymentType: z.enum(['CASH', 'CREDIT', 'PARTIAL']).optional(),
  customer: z.string().optional(),
  paidAmount: z.number().min(0).optional(),
  dueAmount: z.number().min(0).optional()
});

const bulkCreateSchema = z.object({
  items: z.array(
    z.object({
      product: z.string(),
      quantity: z.number().min(1, { message: 'Must be equal or grater than 1' }),
      productPrice: z.number().min(0).optional(),
    }),
  ),
  buyerName: z.string(),
  date: z.string(),
  paymentType: z.enum(['CASH', 'CREDIT', 'PARTIAL']).optional(),
  customer: z.string().optional(),
  paidAmount: z.number().min(0).optional(),
});

const updateSchema = z.object({
  product: z.string().optional(),
  quantity: z.number().min(1, { message: 'Must be equal or grater than 1' }).optional(),
  price: z.number().min(1, { message: 'Must be equal or grater than 1' }).optional(),
  buyerName: z.string().optional(),
  date: z.string().optional()
});

const saleValidator = { createSchema, updateSchema, bulkCreateSchema };
export default saleValidator;
