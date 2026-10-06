export type FinanceSecField =
  | "totalIncome"
  | "interestBearingDebt"
  | "interestBearingAssets"
  | "impermissibleIncome"
  | "marketCapitalization";

export type SecMappingStatus =
  | "automated"
  | "review_required"
  | "external_source_required"
  | "not_automated";

export type FinanceSecMapping = {
  field: FinanceSecField;
  status: SecMappingStatus;
  concepts: string[];
  description: string;
  notes: string;
};

export const financeSecMappings: FinanceSecMapping[] = [
  {
    field: "totalIncome",
    status: "automated",
    concepts: [
      "RevenueFromContractWithCustomerExcludingAssessedTax",
      "Revenues",
    ],
    description:
      "Use the company's reported revenue concept from the latest appropriate SEC filing period.",
    notes:
      "Do not mix quarterly and year-to-date values. The selected value must preserve its reporting period.",
  },

  {
  field: "interestBearingDebt",
  status: "review_required",
  concepts: [
    "LongTermDebt",
    "LongTermDebtCurrent",
    "LongTermDebtNoncurrent",
    "ShortTermBorrowings",
  ],
  description:
    "Debt-related SEC concepts used to identify interest-bearing financing.",
  notes:
    "Use a reported total debt value when clearly available. Otherwise, current and non-current components may be combined only when they are confirmed to represent separate components of the same debt balance. Short-term borrowings may be included when they represent financing debt. Never add a reported total together with its components because this can double-count debt. Final Shariah classification requires methodology review.",
},

  {
    field: "interestBearingAssets",
    status: "review_required",
    concepts: [
      "MarketableSecurities",
      "MarketableSecuritiesCurrent",
      "MarketableSecuritiesNoncurrent",
      "AvailableForSaleSecurities",
      "AvailableForSaleSecuritiesCurrent",
    ],
    description:
      "SEC concepts that may contain investment or securities balances relevant to interest-bearing assets.",
    notes:
      "Do not automatically classify all marketable or available-for-sale securities as interest-bearing assets. Security composition may include different instruments.",
  },

  {
    field: "impermissibleIncome",
    status: "not_automated",
    concepts: [
      "InvestmentIncomeInterest",
    ],
    description:
      "Interest income may appear in SEC XBRL data for some companies.",
    notes:
      "InvestmentIncomeInterest must NOT automatically be treated as impermissible income. HalalWise requires a Shariah-specific determination or reviewed source before using this value for screening.",
  },

  {
    field: "marketCapitalization",
    status: "external_source_required",
    concepts: [],
    description:
      "Market capitalization is not reliably provided by SEC Company Facts.",
    notes:
      "Use a separate market-data source and keep the source date/time with the value.",
  },
];