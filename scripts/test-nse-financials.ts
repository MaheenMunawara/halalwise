import {
  fetchNseFinancials,
} from "./nse-financials.ts";

const symbol = "TCS";

const filingUrl =
  "https://nsearchives.nseindia.com/corporate/ixbrl/INTEGRATED_FILING_INDAS_173420_09072026183620_iXBRL_WEB.html";

async function main() {
  console.log(
    `Testing reusable NSE extractor for ${symbol}...\n`
  );

  const result =
    await fetchNseFinancials(
      symbol,
      filingUrl
    );

  console.log(
    "========== EXTRACTED FINANCIAL DATA ==========\n"
  );

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );

  console.log(
    "\n========== TEST COMPLETE ==========\n"
  );
}

main().catch((error) => {
  console.error(
    "NSE financial extraction test failed:",
    error
  );

  process.exit(1);
});