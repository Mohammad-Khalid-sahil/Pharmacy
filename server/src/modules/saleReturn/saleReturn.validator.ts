import { z } from 'zod';

const itemSchema = z.object({
  product: z.string(),
  quantity: z.number().min(1),
  refundAmount: z.number().min(0)
});

const createSchema = z.object({
  sale: z.string(),
  customer: z.string().optional(),
  items: z.array(itemSchema).min(1),
  totalRefund: z.number().min(0),
  reason: z.string().optional(),
  note: z.string().optional()
});

const saleReturnValidator = { createSchema };
export default saleReturnValidator;
