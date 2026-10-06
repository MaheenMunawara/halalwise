export type FinancialPeriod = {
  periodEnd: string;
  filed: string | null;
  form: string | null;
};

export type FinancialValue = {
  value: number;
  currency: string;
  sourceConcept: string;
  period: FinancialPeriod;
};

export type AutomatedFinancialData = {
  companyName: string;
  ticker: string;
  cik?: string;

  marketCapitalization: FinancialValue | null;

  interestBearingDebt: FinancialValue | null;

  interestBearingAssets: FinancialValue | null;

  totalIncome: FinancialValue | null;

  impermissibleIncome: FinancialValue | null;

  source: {
    name: string;
    url: string;
    retrievedAt: string;
  };
};