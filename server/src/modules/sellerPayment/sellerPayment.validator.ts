import { z } from 'zod';

const createSchema = z.object({
  seller: z.string(),
  amount: z.number().min(0.01),
  paymentDate: z.string().optional(),
  note: z.string().optional()
});

const sellerPaymentValidator = { createSchema };
export default sellerPaymentValidator;
