import { z } from '@genkit-ai/core';

export const GetCustomerInputSchema = z
  .object({
    id: z.string().optional().describe('Eindeutige Kunden-ID, z.B. "c-001".'),
    query: z
      .string()
      .optional()
      .describe(
        'Alternativ: Vor-, Nach- oder voller Name des Kunden. Wird nicht-leer und eindeutig erwartet.',
      ),
  })
  .refine((value) => Boolean(value.id ?? value.query), {
    message: 'Mindestens id oder query muss angegeben werden.',
  });
export type GetCustomerInput = z.infer<typeof GetCustomerInputSchema>;

export const CustomerProductSchema = z.object({
  name: z.string(),
  category: z.enum(['Aktienfonds', 'Rentenfonds', 'Mischfonds', 'ETF', 'Versicherung']),
  value: z.number(),
});
export type CustomerProductDto = z.infer<typeof CustomerProductSchema>;

export const CustomerSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  age: z.number(),
  email: z.string(),
  phone: z.string(),
  address: z.string(),
  riskProfile: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  depotValue: z.number(),
  lastContact: z.string(),
  advisorNotes: z.string(),
  products: z.array(CustomerProductSchema),
});
export type CustomerDto = z.infer<typeof CustomerSchema>;

export const GetCustomerOutputSchema = CustomerSchema;
export type GetCustomerOutput = z.infer<typeof GetCustomerOutputSchema>;

export const GET_CUSTOMER_TOOL_DESCRIPTION = [
  'Lädt die vollständige Kundenakte eines Kunden anhand der ID oder des Namens.',
  'Bevorzuge die ID, wenn sie aus listCustomers oder dem aktuellen Kontext bekannt ist.',
  'Verwende query nur, wenn der Berater einen Kunden namentlich öffnen möchte und du keine ID hast.',
  'Wenn der Aufruf erfolgreich ist, ist die Kundenakte automatisch im Portal geladen — bestätige in einem kurzen deutschen Satz und biete an, gezielt Auskunft zu geben.',
  'Wenn kein Kunde gefunden wird, schlägt das Tool fehl. Erkläre dem Berater dann kurz auf Deutsch, dass kein passender Kunde existiert.',
].join('\n');
