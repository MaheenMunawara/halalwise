const symbol = "TCS";

const url =
  `https://www.nseindia.com/api/historical/cm/equity?symbol=${symbol}&series=["EQ"]&from=30-06-2026&to=30-06-2026`;

console.log("Testing NSE historical endpoint...");
console.log(`URL: ${url}`);

async function main() {
  const homepageResponse = await fetch(
    "https://www.nseindia.com/",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",

        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

        "Accept-Language":
          "en-US,en;q=0.9",
      },
    }
  );

  console.log(
    `NSE homepage status: ${homepageResponse.status}`
  );

  const cookies =
    homepageResponse.headers.get("set-cookie");

  console.log(
    `Cookies received: ${cookies ? "YES" : "NO"}`
  );

  const cookieHeader =
    cookies
      ?.split(/,(?=[^;,]+=)/)
      .map((item) =>
        item.split(";")[0]
      )
      .join("; ") ?? "";

  const response = await fetch(
    url,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",

        Accept:
          "application/json,text/plain,*/*",

        "Accept-Language":
          "en-US,en;q=0.9",

        Referer:
          "https://www.nseindia.com/",

        "X-Requested-With":
          "XMLHttpRequest",

        ...(cookieHeader
          ? {
              Cookie: cookieHeader,
            }
          : {}),
      },
    }
  );

  console.log(
    `Historical endpoint status: ${response.status} ${response.statusText}`
  );

  const text =
    await response.text();

  console.log("\n========== RESPONSE ==========");
  console.log(text.slice(0, 2000));
  console.log("==============================\n");
}

main().catch((error) => {
  console.error(
    "NSE endpoint test failed:",
    error
  );

  process.exit(1);
});