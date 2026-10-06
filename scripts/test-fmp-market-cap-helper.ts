import { getHistoricalMarketCap } from "./fmp-market-cap.ts";

const result = await getHistoricalMarketCap(
  "AAPL",
  "2026-06-27"
);

console.log("HISTORICAL MARKET CAP RESULT");
console.log("============================");
console.log(JSON.stringify(result, null, 2));