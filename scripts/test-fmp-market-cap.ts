import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const apiKey = process.env.FMP_API_KEY;

if (!apiKey) {
  throw new Error("FMP_API_KEY is missing from .env.local");
}

const url =
  `https://financialmodelingprep.com/stable/historical-market-capitalization` +
  `?symbol=AAPL&apikey=${apiKey}`;

const response = await fetch(url);

if (!response.ok) {
  throw new Error(
    `FMP request failed: ${response.status} ${response.statusText}`
  );
}

const data = await response.json();

console.log("FMP MARKET CAP TEST");
console.log("==================");
console.log(JSON.stringify(data, null, 2));