import type { Customer } from '../../shared/customer.js';
import { getCustomerById } from '../data/customers.js';
import { toGetCustomerOutput } from '../tools/get-customer.tool.handler.js';

export interface PreambleInput {
  readonly userName: string | null;
  readonly currentCustomerId: string | null | undefined;
  readonly loadCustomer: boolean | undefined;
}

export function buildUserPreamble(userName: string | null): string {
  return userName
    ? `The advisor's name is ${userName}. Address them by name when natural.`
    : 'The advisor is not signed in; use a neutral German salutation.';
}

export function buildCustomerPreamble({
  currentCustomerId,
  loadCustomer,
}: Pick<PreambleInput, 'currentCustomerId' | 'loadCustomer'>): string {
  if (!currentCustomerId) {
    return 'Aktuell ist keine Kundenakte geöffnet. Wenn der Berater einen Kunden nennt, lade ihn mit getCustomer.';
  }
  const customer = getCustomerById(currentCustomerId);
  if (!customer) {
    return `Der Berater hat die Kunden-ID ${currentCustomerId} ausgewählt, aber kein passender Kunde wurde gefunden. Bitte um Klärung.`;
  }
  if (loadCustomer) {
    const fullData = JSON.stringify(toGetCustomerOutput(customer), null, 2);
    return [
      `Der Berater hat soeben die Kundenakte von ${customer.firstName} ${customer.lastName} (ID ${customer.id}) geöffnet bzw. gewechselt.`,
      'Die vollständigen Kundendaten findest du im folgenden JSON. Nutze sie direkt; ein erneuter getCustomer-Aufruf ist nur bei fehlenden Detailwerten nötig.',
      `KUNDE_KONTEXT_JSON:\n${fullData}`,
      'Bestätige den Wechsel in einem kurzen deutschen Satz, falls noch nicht geschehen.',
    ].join('\n');
  }
  return `Der Berater betrachtet aktuell die Kundenakte von ${customer.firstName} ${customer.lastName} (ID ${customer.id}). Beziehe dich bei Fragen ohne andere Angabe auf diesen Kunden.`;
}

export function buildSystemPreamble(systemPrompt: string, input: PreambleInput): string {
  return [systemPrompt, buildUserPreamble(input.userName), buildCustomerPreamble(input)].join(
    '\n\n',
  );
}

export function resolveCurrentCustomer(
  currentCustomerId: string | null | undefined,
): Customer | undefined {
  return currentCustomerId ? getCustomerById(currentCustomerId) : undefined;
}
