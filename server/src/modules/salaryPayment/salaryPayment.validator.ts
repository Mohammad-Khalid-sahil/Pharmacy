import { z } from 'zod';

const createSchema = z.object({
  employee: z.string(),
  amount: z.number().min(0.01),
  paymentDate: z.string().optional(),
  note: z.string().optional()
});

const salaryPaymentValidator = { createSchema };
export default salaryPaymentValidator;
