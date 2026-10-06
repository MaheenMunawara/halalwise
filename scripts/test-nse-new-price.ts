const symbol = "TCS";

const fromDate = "30-06-2026";
const toDate = "30-06-2026";

async function main() {
  console.log(
    "Testing NSE security-wise historical endpoint..."
  );

  const homepageResponse = await fetch(
    "https://www.nseindia.com/report-detail/eq_security",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",

        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

        "Accept-Language":
          "en-US,en;q=0.9",

        Referer:
          "https://www.nseindia.com/",
      },
    }
  );

  console.log(
    `NSE page status: ${homepageResponse.status}`
  );

  const setCookie =
    homepageResponse.headers.get(
      "set-cookie"
    );

  console.log(
    `Cookies received: ${
      setCookie ? "YES" : "NO"
    }`
  );

  const cookie =
    setCookie
      ?.split(/,(?=[^;,]+=)/)
      .map((item) =>
        item.split(";")[0]
      )
      .join("; ") ?? "";

  const params =
    new URLSearchParams();

  params.set(
    "from",
    fromDate
  );

  params.set(
    "to",
    toDate
  );

  params.set(
    "symbol",
    symbol
  );

  params.set(
    "type",
    "priceVolumeDeliverable"
  );

  params.set(
    "series",
    "EQ"
  );

  params.set(
    "csv",
    "true"
  );

  const url =
    `https://www.nseindia.com/api/historicalOR/generateSecurityWiseHistoricalData?${params.toString()}`;

  console.log(
    `\nHistorical endpoint:\n${url}\n`
  );

  const response = await fetch(
    url,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",

        Accept:
          "text/csv,application/json,text/plain,*/*",

        "Accept-Language":
          "en-US,en;q=0.9",

        Referer:
          "https://www.nseindia.com/report-detail/eq_security",

        "X-Requested-With":
          "XMLHttpRequest",

        ...(cookie
          ? {
              Cookie: cookie,
            }
          : {}),
      },
    }
  );

  console.log(
    `Historical endpoint status: ${response.status} ${response.statusText}`
  );

  const contentType =
    response.headers.get(
      "content-type"
    );

  console.log(
    `Content-Type: ${contentType ?? "not provided"}`
  );

  const body =
    await response.text();

  console.log(
    "\n========== RESPONSE =========="
  );

  console.log(
    body.slice(0, 5000)
  );

  console.log(
    "=============================="
  );
}

main().catch((error) => {
  console.error(
    "\nNSE endpoint test failed:",
    error
  );

  process.exit(1);
});