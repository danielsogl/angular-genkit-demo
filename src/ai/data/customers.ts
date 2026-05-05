import type { Customer, CustomerSummary } from '../../shared/customer.js';
import { customerSummary, fullName } from '../../shared/customer.js';

export const FAKE_CUSTOMERS: readonly Customer[] = [
  {
    id: 'c-001',
    firstName: 'Anna',
    lastName: 'Müller',
    age: 43,
    email: 'anna.mueller@example.de',
    phone: '+49 30 1234567',
    address: 'Beethovenstraße 12, 10117 Berlin',
    riskProfile: 4,
    depotValue: 185_400,
    lastContact: '2026-04-12',
    advisorNotes:
      'Erfahrene Anlegerin mit Fokus auf Wachstumswerte. Plant Eigenheim-Refinanzierung in 2027.',
    products: [
      { name: 'DWS Top Dividende', category: 'Aktienfonds', value: 78_200 },
      { name: 'iShares Core MSCI World', category: 'ETF', value: 64_800 },
      { name: 'Plansecur Vermögensschutz', category: 'Versicherung', value: 42_400 },
    ],
  },
  {
    id: 'c-002',
    firstName: 'Bernd',
    lastName: 'Schmidt',
    age: 67,
    email: 'bernd.schmidt@example.de',
    phone: '+49 89 9876543',
    address: 'Maximilianstraße 4, 80539 München',
    riskProfile: 2,
    depotValue: 412_900,
    lastContact: '2026-03-28',
    advisorNotes:
      'Im Ruhestand. Wünscht sicheren Kapitalerhalt und regelmäßige Ausschüttungen für die Enkel.',
    products: [
      { name: 'Allianz Euro Rentenfonds', category: 'Rentenfonds', value: 220_000 },
      { name: 'Union Investment UniRak', category: 'Mischfonds', value: 142_900 },
      { name: 'Plansecur Pflegevorsorge', category: 'Versicherung', value: 50_000 },
    ],
  },
  {
    id: 'c-003',
    firstName: 'Carla',
    lastName: 'Weber',
    age: 31,
    email: 'carla.weber@example.de',
    phone: '+49 40 5556677',
    address: 'Hohe Bleichen 21, 20354 Hamburg',
    riskProfile: 5,
    depotValue: 58_300,
    lastContact: '2026-04-29',
    advisorNotes:
      'Junge Berufseinsteigerin (IT). Hoher Sparbeitrag, langer Anlagehorizont, offen für Tech-ETFs.',
    products: [
      { name: 'Xtrackers MSCI World IT', category: 'ETF', value: 31_000 },
      { name: 'Amundi MSCI Emerging Markets', category: 'ETF', value: 18_300 },
      { name: 'Plansecur BU-Schutz', category: 'Versicherung', value: 9_000 },
    ],
  },
  {
    id: 'c-004',
    firstName: 'Dieter',
    lastName: 'Becker',
    age: 54,
    email: 'dieter.becker@example.de',
    phone: '+49 221 4433221',
    address: 'Apostelnstraße 9, 50667 Köln',
    riskProfile: 3,
    depotValue: 246_750,
    lastContact: '2026-02-15',
    advisorNotes:
      'Selbstständig (Architekturbüro). Möchte Liquidität für Praxiskauf der Tochter parken.',
    products: [
      {
        name: 'Flossbach von Storch Multiple Opportunities',
        category: 'Mischfonds',
        value: 120_000,
      },
      { name: 'Vanguard FTSE All-World', category: 'ETF', value: 96_750 },
      { name: 'Plansecur Berufsunfähigkeit', category: 'Versicherung', value: 30_000 },
    ],
  },
];

export function getCustomerById(id: string): Customer | undefined {
  return FAKE_CUSTOMERS.find((c) => c.id === id);
}

export function findCustomersByQuery(query: string): readonly Customer[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return FAKE_CUSTOMERS;
  }
  return FAKE_CUSTOMERS.filter((c) => {
    const name = fullName(c).toLowerCase();
    return (
      name.includes(needle) ||
      c.firstName.toLowerCase().includes(needle) ||
      c.lastName.toLowerCase().includes(needle) ||
      c.id.toLowerCase() === needle
    );
  });
}

export function listCustomerSummaries(query?: string): readonly CustomerSummary[] {
  const matches = query ? findCustomersByQuery(query) : FAKE_CUSTOMERS;
  return matches.map(customerSummary);
}
