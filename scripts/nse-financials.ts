import dotenv from "dotenv";

dotenv.config({
  path: ".env.local",
});

export type NseFinancialResult = {
  symbol: string;
  reportingDate: string | null;
  currency: string | null;
  rounding: string | null;

  revenueFromOperations: number | null;
  otherIncome: number | null;
  totalIncome: number | null;

  financeCosts: number | null;
  profitBeforeTax: number | null;
  taxExpense: number | null;
  profitAfterTax: number | null;

  sourceUrl: string;
};

function cleanText(html: string): string {
  return html
    .replace(
      /<script[\s\S]*?<\/script>/gi,
      " "
    )
    .replace(
      /<style[\s\S]*?<\/style>/gi,
      " "
    )
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(
  value: string
): number | null {
  const cleaned = value
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");

  if (!cleaned) {
    return null;
  }

  const number = Number(cleaned);

  return Number.isFinite(number)
    ? number
    : null;
}

function extractFinancialValue(
  text: string,
  label: string
): number | null {
  const pattern = new RegExp(
    `${label}\\s+(-?[\\d,]+(?:\\.\\d+)?)`,
    "i"
  );

  const match = text.match(pattern);

  if (!match) {
    return null;
  }

  return parseNumber(match[1]);
}

function extractDate(
  text: string
): string | null {
  const match = text.match(
    /Date of end of reporting period\s+(\d{2}-\d{2}-\d{4})/i
  );

  return match?.[1] ?? null;
}

function extractTextValue(
  text: string,
  label: string
): string | null {
  const pattern = new RegExp(
    `${label}\\s+([^\\s]+)`,
    "i"
  );

  const match = text.match(pattern);

  return match?.[1] ?? null;
}

function convertLakhsToRupees(
  value: number | null
): number | null {
  if (value === null) {
    return null;
  }

  return value * 100000;
}

export async function fetchNseFinancials(
  symbol: string,
  filingUrl: string
): Promise<NseFinancialResult> {
  const response = await fetch(
    filingUrl,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",

        Accept:
          "text/html,application/xhtml+xml",

        Referer:
          "https://www.nseindia.com/",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `NSE filing request failed: ${response.status} ${response.statusText}`
    );
  }

  const html =
    await response.text();

  const text =
    cleanText(html);

  const reportingDate =
    extractDate(text);

  const currency =
    extractTextValue(
      text,
      "Description of presentation currency"
    );

  const rounding =
    extractTextValue(
      text,
      "Level of rounding used in financial results"
    );

  const revenueFromOperations =
    extractFinancialValue(
      text,
      "Revenue from operations"
    );

  const otherIncome =
    extractFinancialValue(
      text,
      "Other income"
    );

  const totalIncome =
    extractFinancialValue(
      text,
      "Total income"
    );

  const financeCosts =
    extractFinancialValue(
      text,
      "Finance costs"
    );

  const profitBeforeTax =
    extractFinancialValue(
      text,
      "Total profit before tax"
    );

  const taxExpense =
  null;

  const profitAfterTax =
    extractFinancialValue(
      text,
      "Total profit \\(loss\\) for period"
    );

  return {
    symbol,

    reportingDate,

    currency,

    rounding,

    revenueFromOperations:
      convertLakhsToRupees(
        revenueFromOperations
      ),

    otherIncome:
      convertLakhsToRupees(
        otherIncome
      ),

    totalIncome:
      convertLakhsToRupees(
        totalIncome
      ),

    financeCosts:
      convertLakhsToRupees(
        financeCosts
      ),

    profitBeforeTax:
      convertLakhsToRupees(
        profitBeforeTax
      ),

    taxExpense:
      convertLakhsToRupees(
        taxExpense
      ),

    profitAfterTax:
      convertLakhsToRupees(
        profitAfterTax
      ),

    sourceUrl: filingUrl,
  };
}