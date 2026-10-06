export const secFinancialMapping = {
  marketCapitalization: [],

  interestBearingDebt: [
  "LongTermDebt",
  "CommercialPaper",
  "LongTermDebtCurrent",
  "LongTermDebtNoncurrent",
  "ShortTermBorrowings",
  "ShortTermDebt",
],
  interestBearingAssets: [
    "MarketableSecuritiesCurrent",
    "AvailableForSaleSecuritiesDebtSecuritiesCurrent",
    "HeldToMaturitySecuritiesCurrent",
  ],

  totalIncome: [],

  impermissibleIncome: [],
} as const;