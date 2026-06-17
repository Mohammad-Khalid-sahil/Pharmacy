import { z } from 'zod';
import { CashboxDirection } from '../../constant/ledgerTypes';

const isPersonAccountType = (type?: string, transactionType?: string) =>
  ['DEPOSIT', 'WITHDRAWAL'].includes(String(type)) || ['DEPOSIT', 'WITHDRAWAL'].includes(String(transactionType));

const createSchema = z
  .object({
    type: z.string().min(1),
    direction: z.enum([CashboxDirection.IN, CashboxDirection.OUT]).optional(),
    amount: z.number().min(0.01),
    personName: z.string().trim().optional(),
    transactionType: z.enum(['DEPOSIT', 'WITHDRAWAL']).optional(),
    sourceModule: z.string().optional(),
    referenceId: z.string().optional(),
    relatedCustomer: z.string().optional(),
    relatedCashboxReference: z.string().optional(),
    description: z.string().optional(),
    reason: z.string().optional(),
    actor: z.string().trim().optional(),
    performedBy: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (isPersonAccountType(data.type, data.transactionType)) {
      const name = data.personName?.trim() || data.actor?.trim() || data.performedBy?.trim();
      if (!name) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Person name is required', path: ['personName'] });
      }
      return;
    }

    if (!data.direction) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Cashbox direction is required', path: ['direction'] });
    }
  });

const cashboxTransactionValidator = { createSchema };
export default cashboxTransactionValidator;
