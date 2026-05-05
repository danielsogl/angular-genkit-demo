export type RiskProfile = 1 | 2 | 3 | 4 | 5;

export interface CustomerProduct {
  readonly name: string;
  readonly category: 'Aktienfonds' | 'Rentenfonds' | 'Mischfonds' | 'ETF' | 'Versicherung';
  readonly value: number;
}

export interface Customer {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly age: number;
  readonly email: string;
  readonly phone: string;
  readonly address: string;
  readonly riskProfile: RiskProfile;
  readonly depotValue: number;
  readonly lastContact: string;
  readonly advisorNotes: string;
  readonly products: readonly CustomerProduct[];
}

export interface CustomerSummary {
  readonly id: string;
  readonly name: string;
  readonly shortInfo: string;
}

export function fullName(customer: Pick<Customer, 'firstName' | 'lastName'>): string {
  return `${customer.firstName} ${customer.lastName}`;
}

export function customerSummary(customer: Customer): CustomerSummary {
  return {
    id: customer.id,
    name: fullName(customer),
    shortInfo: `${customer.age} Jahre, Risikoklasse ${customer.riskProfile}, Depot ${customer.depotValue.toLocaleString('de-DE')} €`,
  };
}
