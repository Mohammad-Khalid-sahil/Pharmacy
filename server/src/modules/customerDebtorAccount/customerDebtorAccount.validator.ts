import { z } from 'zod';

const addDebtSchema = z.object({
  customerName: z.string().trim().min(1, 'Customer name is required'),
  date: z.coerce.date(),
  amount: z.number().min(0.01, 'Amount must be greater than zero'),
  reason: z.string().trim().min(1, 'Debt reason is required'),
  notes: z.string().trim().optional(),
  accountNotes: z.string().trim().optional(),
});

const customerDebtorAccountValidator = { addDebtSchema };
export default customerDebtorAccountValidator;
