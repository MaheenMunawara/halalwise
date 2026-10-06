export type SecCompany = {
  companyName: string;
  ticker: string;
  cik: string;
};

export const secCompanies: SecCompany[] = [
  {
    companyName: "Apple",
    ticker: "AAPL",
    cik: "0000320193",
  },
  {
    companyName: "Microsoft",
    ticker: "MSFT",
    cik: "0000789019",
  },
  {
    companyName: "NVIDIA",
    ticker: "NVDA",
    cik: "0001045810",
  },
  {
    companyName: "Alphabet",
    ticker: "GOOGL",
    cik: "0001652044",
  },
  {
    companyName: "Amazon",
    ticker: "AMZN",
    cik: "0001018724",
  },
];