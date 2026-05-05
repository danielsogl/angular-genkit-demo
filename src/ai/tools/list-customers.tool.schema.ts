import { z } from '@genkit-ai/core';

export const ListCustomersInputSchema = z.object({
  query: z
    .string()
    .optional()
    .describe(
      'Optionaler Such-String (Vor-, Nach- oder voller Name). Leer lassen, um alle Kunden zu listen.',
    ),
});
export type ListCustomersInput = z.infer<typeof ListCustomersInputSchema>;

export const CustomerSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  shortInfo: z.string(),
});
export type CustomerSummaryDto = z.infer<typeof CustomerSummarySchema>;

export const ListCustomersOutputSchema = z.object({
  customers: z.array(CustomerSummarySchema),
});
export type ListCustomersOutput = z.infer<typeof ListCustomersOutputSchema>;

export const LIST_CUSTOMERS_TOOL_DESCRIPTION = [
  'Listet die Kunden des Beraters mit Kurzprofil (Alter, Risikoklasse, Depot-Volumen).',
  'Verwende dieses Tool, wenn der Berater nach seiner Kundenliste fragt oder einen Kunden suchen möchte, dessen genauen Namen er nicht kennt.',
  'Gib bei zielgerichteter Suche optional einen Teil des Namens als query mit; lasse query weg, wenn alle Kunden zurückgegeben werden sollen.',
  'Antworte dem Berater anschließend in einer kurzen, nüchternen deutschen Aufzählung — keine Markdown-Formatierung.',
].join('\n');
