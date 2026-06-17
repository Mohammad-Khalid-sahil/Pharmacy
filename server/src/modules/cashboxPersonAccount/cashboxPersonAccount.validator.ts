import { z } from 'zod';

const addTransactionSchema = z.object({
  personName: z.string().trim().min(1, 'Person name is required'),
  transactionType: z.enum(['DEPOSIT', 'WITHDRAWAL']),
  amount: z.number().min(0.01, 'Amount must be greater than zero'),
  reason: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  date: z.coerce.date().optional(),
});

const cashboxPersonAccountValidator = { addTransactionSchema };
export default cashboxPersonAccountValidator;
