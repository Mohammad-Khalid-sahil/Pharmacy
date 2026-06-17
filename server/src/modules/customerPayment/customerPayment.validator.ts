import { z } from 'zod';

const createSchema = z.object({
  customer: z.string(),
  amount: z.number().min(0.01),
  paymentDate: z.string().optional(),
  note: z.string().optional()
});

const customerPaymentValidator = { createSchema };
export default customerPaymentValidator;
