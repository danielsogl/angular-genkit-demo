import type { Customer } from '../../shared/customer.js';
import { findCustomersByQuery, getCustomerById } from '../data/customers.js';
import type { GetCustomerInput, GetCustomerOutput } from './get-customer.tool.schema.js';

export function toGetCustomerOutput(customer: Customer): GetCustomerOutput {
  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    age: customer.age,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    riskProfile: customer.riskProfile,
    depotValue: customer.depotValue,
    lastContact: customer.lastContact,
    advisorNotes: customer.advisorNotes,
    products: customer.products.map((p) => ({
      name: p.name,
      category: p.category,
      value: p.value,
    })),
  };
}

export async function getCustomerHandler({
  id,
  query,
}: GetCustomerInput): Promise<GetCustomerOutput> {
  if (id) {
    const found = getCustomerById(id);
    if (!found) {
      throw new Error(`Kein Kunde mit ID "${id}" gefunden.`);
    }
    return toGetCustomerOutput(found);
  }
  const matches = findCustomersByQuery(query ?? '');
  if (matches.length === 0) {
    throw new Error(`Kein Kunde passt zu "${query}".`);
  }
  if (matches.length > 1) {
    const names = matches.map((c) => `${c.firstName} ${c.lastName} (${c.id})`).join(', ');
    throw new Error(
      `Mehrere Kunden passen zu "${query}": ${names}. Bitte rufe listCustomers auf und nutze danach die ID.`,
    );
  }
  return toGetCustomerOutput(matches[0]);
}
