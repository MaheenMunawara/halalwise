import "dotenv/config";

type NseMarketCapResult = {
  symbol: string;
  reportingDate: string;
  marketCap: number | null;
  closingPrice: number | null;
  priceDate: string | null;
  sharesOutstanding: number | null;
  source: string;
};

function parseIndianNumber(value: string): number {
  return Number(value.replace(/,/g, "").trim());
}

function parseDateToNseFormat(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}-${month}-${year}`;
}

/**
 * Parses a CSV line while respecting values enclosed in quotes.
 *
 * Example:
 * "TCS","EQ","30-Jun-2026","2,097.90","2,090.00"
 *
 * becomes:
 * ["TCS", "EQ", "30-Jun-2026", "2,097.90", "2,090.00"]
 */
function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const character = line[i];

    if (character === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (character === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());

  return values;
}

async function createNseSession(): Promise<string> {
  const response = await fetch(
    "https://www.nseindia.com/report-detail/eq_security",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.nseindia.com/",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `NSE session request failed: ${response.status} ${response.statusText}`
    );
  }

  const setCookie = response.headers.get("set-cookie");

  if (!setCookie) {
    return "";
  }

  return setCookie
    .split(/,(?=[^;,]+=)/)
    .map((item) => item.split(";")[0])
    .join("; ");
}

async function fetchHistoricalClosingPrice(
  symbol: string,
  reportingDate: string,
  cookie: string
): Promise<{
  closingPrice: number;
  priceDate: string;
}> {
  const nseDate = parseDateToNseFormat(reportingDate);

  const params = new URLSearchParams();

  params.set("from", nseDate);
  params.set("to", nseDate);
  params.set("symbol", symbol);
  params.set("type", "priceVolumeDeliverable");
  params.set("series", "EQ");
  params.set("csv", "true");

  const url =
    `https://www.nseindia.com/api/historicalOR/generateSecurityWiseHistoricalData?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
      Accept: "text/csv,application/json,text/plain,*/*",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://www.nseindia.com/report-detail/eq_security",
      "X-Requested-With": "XMLHttpRequest",
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(
      `NSE historical price request failed: ${response.status} ${response.statusText}`
    );
  }

  const csv = await response.text();

  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error(
      "NSE historical price response contained no data rows."
    );
  }

  const headers = parseCsvLine(lines[0]);
  const row = parseCsvLine(lines[1]);

  const closeIndex = headers.findIndex((header) =>
    header.toLowerCase().includes("close price")
  );

  const dateIndex = headers.findIndex(
    (header) => header.toLowerCase() === "date"
  );

  if (closeIndex === -1) {
    throw new Error(
      "Could not find Close Price column in NSE response."
    );
  }

  if (dateIndex === -1) {
    throw new Error(
      "Could not find Date column in NSE response."
    );
  }

  const closingPrice = parseIndianNumber(row[closeIndex]);

  if (!Number.isFinite(closingPrice)) {
    throw new Error(
      `Invalid NSE closing price: ${row[closeIndex]}`
    );
  }

  return {
    closingPrice,
    priceDate: row[dateIndex],
  };
}

async function fetchFilingShareData(
  filingUrl: string,
  cookie: string
): Promise<{
  paidUpCapitalLakhs: number;
  faceValue: number;
}> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(filingUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://www.nseindia.com/",
          ...(cookie ? { Cookie: cookie } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(
          `NSE filing request failed: ${response.status} ${response.statusText}`
        );
      }

      const html = await response.text();

      const normalized = html
        .replace(/&nbsp;/gi, " ")
        .replace(/&#160;/gi, " ")
        .replace(/\s+/g, " ");

      /*
       * NSE filing states:
       *
       * Description of presentation currency: INR
       * Level of rounding used in financial results: Lakhs
       *
       * Therefore paid-up equity share capital is reported in lakhs.
       */

      const paidUpPatterns = [
        /paid[-\s]?up\s+equity\s+share\s+capital[^0-9₹]*₹?\s*([\d,]+(?:\.\d+)?)/i,
        /paid[-\s]?up\s+capital[^0-9₹]*₹?\s*([\d,]+(?:\.\d+)?)/i,
      ];

      const faceValuePatterns = [
        /face\s+value\s+of\s+equity\s+share\s+capital[^0-9₹]*₹?\s*([\d,.]+)/i,
        /face\s+value[^0-9₹]*₹?\s*([\d,.]+)/i,
      ];

      let paidUpCapitalLakhs: number | null = null;
      let faceValue: number | null = null;

      for (const pattern of paidUpPatterns) {
        const match = normalized.match(pattern);

        if (match?.[1]) {
          paidUpCapitalLakhs = parseIndianNumber(match[1]);
          break;
        }
      }

      for (const pattern of faceValuePatterns) {
        const match = normalized.match(pattern);

        if (match?.[1]) {
          faceValue = parseIndianNumber(match[1]);
          break;
        }
      }

      if (
        paidUpCapitalLakhs === null ||
        !Number.isFinite(paidUpCapitalLakhs) ||
        faceValue === null ||
        !Number.isFinite(faceValue) ||
        faceValue <= 0
      ) {
        throw new Error(
          "Could not extract paid-up share capital and face value from NSE filing."
        );
      }

      return {
        paidUpCapitalLakhs,
        faceValue,
      };
    } catch (error) {
      lastError = error;

      if (attempt < 3) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1500 * attempt)
        );
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to fetch NSE filing.");
}

export async function getHistoricalNseMarketCap(
  symbol: string,
  reportingDate: string,
  filingUrl: string
): Promise<NseMarketCapResult> {
  console.log(`Fetching NSE market cap for ${symbol}...`);

  const cookie = await createNseSession();

  console.log("NSE session established.");

  const priceData = await fetchHistoricalClosingPrice(
    symbol,
    reportingDate,
    cookie
  );

  console.log(
    `NSE closing price on ${priceData.priceDate}: ₹${priceData.closingPrice}`
  );

  const shareData = await fetchFilingShareData(
    filingUrl,
    cookie
  );

  console.log(
    `Paid-up share capital: ₹${shareData.paidUpCapitalLakhs} lakhs`
  );

  console.log(
    `Face value: ₹${shareData.faceValue}`
  );

  /*
   * 1 lakh = ₹100,000
   *
   * Paid-up capital is reported in lakhs.
   *
   * Shares outstanding =
   * paid-up capital in rupees / face value per share
   */

  const paidUpCapitalRupees =
    shareData.paidUpCapitalLakhs * 100000;

  const sharesOutstanding =
    paidUpCapitalRupees / shareData.faceValue;

  const marketCap =
    priceData.closingPrice * sharesOutstanding;

  console.log(
    `Calculated shares outstanding: ${sharesOutstanding.toLocaleString("en-IN")}`
  );

  console.log(
    `Calculated market capitalization: ₹${marketCap.toLocaleString("en-IN")}`
  );

  return {
    symbol,
    reportingDate,
    marketCap,
    closingPrice: priceData.closingPrice,
    priceDate: priceData.priceDate,
    sharesOutstanding,
    source:
      "NSE historical security-wise price + NSE company filing",
  };
}