export type FinanceCompanyUniverseInput = {
  companyName: string;
  ticker: string;
  exchange: string;
  country: "India" | "USA";
  sector: string;
};

export const financeCompanyUniverse: FinanceCompanyUniverseInput[] = [
  // -----------------------------
  // INDIA
  // -----------------------------

  {
    companyName: "Tata Consultancy Services",
    ticker: "TCS",
    exchange: "NSE",
    country: "India",
    sector: "Information Technology",
  },

  {
    companyName: "Infosys",
    ticker: "INFY",
    exchange: "NSE",
    country: "India",
    sector: "Information Technology",
  },

  {
    companyName: "HCL Technologies",
    ticker: "HCLTECH",
    exchange: "NSE",
    country: "India",
    sector: "Information Technology",
  },

  {
    companyName: "Wipro",
    ticker: "WIPRO",
    exchange: "NSE",
    country: "India",
    sector: "Information Technology",
  },

  {
    companyName: "Tata Motors",
    ticker: "TATAMOTORS",
    exchange: "NSE",
    country: "India",
    sector: "Automobiles",
  },

  // -----------------------------
  // USA
  // -----------------------------

  {
    companyName: "Apple",
    ticker: "AAPL",
    exchange: "NASDAQ",
    country: "USA",
    sector: "Technology",
  },

  {
    companyName: "Microsoft",
    ticker: "MSFT",
    exchange: "NASDAQ",
    country: "USA",
    sector: "Technology",
  },

  {
    companyName: "NVIDIA",
    ticker: "NVDA",
    exchange: "NASDAQ",
    country: "USA",
    sector: "Technology",
  },

  {
    companyName: "Alphabet",
    ticker: "GOOGL",
    exchange: "NASDAQ",
    country: "USA",
    sector: "Technology",
  },

  {
    companyName: "Amazon",
    ticker: "AMZN",
    exchange: "NASDAQ",
    country: "USA",
    sector: "Consumer Discretionary",
  },
];