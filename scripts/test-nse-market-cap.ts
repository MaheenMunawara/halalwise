import {
  getHistoricalNseMarketCap,
} from "./nse-market-cap.ts";

const symbol = "TCS";

const reportingDate = "2026-06-30";

const filingUrl =
  "https://nsearchives.nseindia.com/corporate/ixbrl/INTEGRATED_FILING_INDAS_173420_09072026183620_iXBRL_WEB.html";

async function main() {
  console.log(
    `Testing NSE market cap for ${symbol}...`
  );

  const result =
    await getHistoricalNseMarketCap(
      symbol,
      reportingDate,
      filingUrl
    );

  console.log(
    "\n========== NSE MARKET CAP RESULT =========="
  );

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );

  if (result.marketCap !== null) {
    console.log(
      `\nMarket capitalization: ₹${result.marketCap.toLocaleString("en-IN")}`
    );
  }

  if (result.closingPrice !== null) {
    console.log(
      `Closing price: ₹${result.closingPrice.toLocaleString("en-IN")}`
    );
  }

  if (
    result.sharesOutstanding !== null
  ) {
    console.log(
      `Shares outstanding: ${result.sharesOutstanding.toLocaleString("en-IN")}`
    );
  }

  console.log(
    "\n===========================================\n"
  );
}

main().catch((error) => {
  console.error(
    "NSE market-cap test failed:",
    error
  );

  process.exit(1);
});