import { z } from 'zod';
import { RecordStatus } from '../../constant/ledgerTypes';

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  position: z.string().optional(),
  salary: z.number().min(0).optional(),
  address: z.string().optional(),
  note: z.string().optional(),
  status: z.enum([RecordStatus.ACTIVE, RecordStatus.INACTIVE]).optional()
});

const updateSchema = createSchema.partial();

const employeeValidator = { createSchema, updateSchema };
export default employeeValidator;
