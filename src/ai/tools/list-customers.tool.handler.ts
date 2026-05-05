import { listCustomerSummaries } from '../data/customers.js';
import type { ListCustomersInput, ListCustomersOutput } from './list-customers.tool.schema.js';

export async function listCustomersHandler({
  query,
}: ListCustomersInput): Promise<ListCustomersOutput> {
  return { customers: [...listCustomerSummaries(query)] };
}
