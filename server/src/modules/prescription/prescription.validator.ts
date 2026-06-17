import { z } from 'zod';

const itemSchema = z.object({
  product: z.string(),
  quantity: z.number().min(1),
  dosage: z.string().optional(),
  instruction: z.string().optional()
});

const createSchema = z.object({
  customer: z.string().optional(),
  doctorName: z.string().optional(),
  patientName: z.string().optional(),
  note: z.string().optional(),
  sale: z.string().optional(),
  items: z.array(itemSchema).min(1),
  totalAmount: z.number().min(0)
});

const prescriptionValidator = { createSchema };
export default prescriptionValidator;
