import { z } from 'zod';

const createSchema = z.object({
  amount: z.number().min(0.01),
  toAccountOrPlace: z.string().min(1),
  transferDate: z.string().optional(),
  note: z.string().optional()
});

const moneyTransferValidator = { createSchema };
export default moneyTransferValidator;
