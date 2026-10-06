import dotenv from "dotenv";

import {
  secFinancialMapping,
} from "./sec-financial-mapping";

import {
  calculateDebtForPeriod,
} from "./sec-debt-calculator";

dotenv.config({
  path: ".env.local",
});

const SEC_USER_AGENT =
  process.env.SEC_USER_AGENT ||
  "HalalWise Finance Research contact@example.com";

type SecFact = {
  label?: string;
  description?: string;
  units?: Record<
    string,
    Array<{
      val: number;
      fy?: number;
      fp?: string;
      form?: string;
      filed?: string;
      end?: string;
      start?: string;
      frame?: string;
    }>
  >;
};

type SecCompanyFacts = {
  entityName?: string;

  facts?: {
    "us-gaap"?: Record<
      string,
      SecFact
    >;
  };
};

async function fetchSecCompany(
  cik: string
) {
  const normalizedCik =
    cik
      .replace(/\D/g, "")
      .padStart(10, "0");

  const url =
    `https://data.sec.gov/api/xbrl/companyfacts/CIK${normalizedCik}.json`;

  console.log(
    "Fetching SEC company data..."
  );

  console.log(
    `CIK: ${normalizedCik}`
  );

  const response = await fetch(
    url,
    {
      headers: {
        "User-Agent":
          SEC_USER_AGENT,

        Accept:
          "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `SEC request failed: ${response.status} ${response.statusText}`
    );
  }

  const data =
    (await response.json()) as SecCompanyFacts;

  const usGaap =
    data.facts?.["us-gaap"];

  if (!usGaap) {
    throw new Error(
      "US-GAAP financial data was not found."
    );
  }

  console.log(
    "\n=============================="
  );

  console.log(
    "HALALWISE SEC DEBT TEST"
  );

  console.log(
    "=============================="
  );

  console.log(
    `Company: ${
      data.entityName ??
      "Unknown"
    }`
  );

  /*
   * We use Apple's latest period
   * discovered in the previous test.
   *
   * We will later automate
   * period selection.
   */

  const periodEnd =
    "2026-06-27";

  console.log(
    `Financial period: ${periodEnd}`
  );

  const debt =
    calculateDebtForPeriod(
      usGaap,

      secFinancialMapping
        .interestBearingDebt,

      periodEnd
    );

  console.log(
    "\nDEBT COMPONENTS"
  );

  if (
    debt.components.length === 0
  ) {
    console.log(
      "No debt components found."
    );
  }

  for (
    const component
    of debt.components
  ) {
    console.log(
      "\n----------------------------------------"
    );

    console.log(
      `Concept: ${component.concept}`
    );

    console.log(
      `Label: ${component.label}`
    );

    console.log(
      `Value: ${component.value}`
    );

    console.log(
      `Unit: ${component.unit}`
    );

    console.log(
      `Period end: ${component.periodEnd}`
    );

    console.log(
      `Filed: ${component.filed}`
    );

    console.log(
      `Form: ${component.form}`
    );
  }

  console.log(
    "\n========================================"
  );

  console.log(
    "TOTAL CANDIDATE DEBT"
  );

  console.log(
    "========================================"
  );

  console.log(
    debt.total
  );

  console.log(
    "\nIMPORTANT:"
  );

  console.log(
    "This is a candidate aggregate."
  );

  console.log(
    "It has NOT yet been approved as the final Shariah debt figure."
  );

  console.log(
    "We must check for overlapping/double-counted SEC concepts before using it."
  );
}

fetchSecCompany(
  "0000320193"
).catch(
  (error) => {
    console.error(
      "\nSEC FETCH FAILED"
    );

    console.error(
      error instanceof Error
        ? error.message
        : error
    );

    process.exit(1);
  }
);