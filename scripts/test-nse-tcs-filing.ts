const url =
  "https://nsearchives.nseindia.com/corporate/ixbrl/INTEGRATED_FILING_INDAS_173420_09072026183620_iXBRL_WEB.html";

async function main() {
  console.log(
    "Testing real NSE TCS XBRL filing...\n"
  );

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      Referer: "https://www.nseindia.com/",
    },
  });

  console.log(
    `NSE response status: ${response.status}`
  );

  if (!response.ok) {
    throw new Error(
      `NSE filing request failed: ${response.status} ${response.statusText}`
    );
  }

  const html = await response.text();

  console.log(
    `Downloaded characters: ${html.length}`
  );

  console.log(
    "\n========== TCS FILING PREVIEW ==========\n"
  );

  console.log(
    html.slice(0, 5000)
  );

  console.log(
    "\n========== TEST COMPLETE ==========\n"
  );
}

main().catch((error) => {
  console.error(
    "NSE TCS filing test failed:",
    error
  );

  process.exit(1);
});