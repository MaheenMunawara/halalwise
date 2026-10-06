export type FinanceDataSourceConfig = {
  country: "India" | "USA";
  sourceName: string;
  sourceType: "official_filing" | "official_api";
  baseUrl: string;
};

export const financeDataSources: FinanceDataSourceConfig[] = [
  {
    country: "India",
    sourceName: "NSE India",
    sourceType: "official_filing",
    baseUrl: "https://www.nseindia.com",
  },
  {
    country: "USA",
    sourceName: "SEC EDGAR",
    sourceType: "official_api",
    baseUrl: "https://data.sec.gov",
  },
];