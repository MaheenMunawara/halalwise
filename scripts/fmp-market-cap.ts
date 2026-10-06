import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

type FmpMarketCapRecord = {
  symbol: string;
  date: string;
  marketCap: number;
};

export type HistoricalMarketCapResult = {
  symbol: string;
  requestedDate: string;
  marketCap: number | null;
  marketCapDate: string | null;
  source: string;
};

export async function getHistoricalMarketCap(
  symbol: string,
  reportingDate: string
): Promise<HistoricalMarketCapResult> {
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    throw new Error(
      "FMP_API_KEY is missing from .env.local"
    );
  }

  const url =
    `https://financialmodelingprep.com/stable/historical-market-capitalization` +
    `?symbol=${encodeURIComponent(symbol)}` +
    `&apikey=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `FMP request failed: ${response.status} ${response.statusText}`
    );
  }

  const data =
    (await response.json()) as FmpMarketCapRecord[];

  if (!Array.isArray(data)) {
    throw new Error(
      "FMP returned an unexpected response."
    );
  }

  const validRecords = data
    .filter(
      (record) =>
        record.symbol === symbol &&
        typeof record.date === "string" &&
        typeof record.marketCap === "number" &&
        Number.isFinite(record.marketCap) &&
        record.date <= reportingDate
    )
    .sort((a, b) =>
      b.date.localeCompare(a.date)
    );

  const match = validRecords[0];

  if (!match) {
    return {
      symbol,
      requestedDate: reportingDate,
      marketCap: null,
      marketCapDate: null,
      source: "Financial Modeling Prep",
    };
  }

  return {
    symbol,
    requestedDate: reportingDate,
    marketCap: match.marketCap,
    marketCapDate: match.date,
    source: "Financial Modeling Prep",
  };
}