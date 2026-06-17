import { z } from 'zod';

const createSchema = z.object({
  title: z.string(),
  amount: z.number().min(0.01),
  date: z.string(),
  note: z.string().optional()
});

const updateSchema = createSchema.partial();

const expenseValidator = { createSchema, updateSchema };
export default expenseValidator;
