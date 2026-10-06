const cik = "0000320193";

const url =
  `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;

type SecFact = {
  fy?: number;
  fp?: string;
  form?: string;
  filed?: string;
  start?: string;
  end?: string;
  val: number;
  frame?: string;
};

async function main() {
  console.log(
    "Fetching SEC YTD income data for Apple..."
  );

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "HalalWise/1.0 contact@halalwise.com",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `SEC request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  const usGaap =
    data.facts?.["us-gaap"];

  if (!usGaap) {
    throw new Error(
      "No US-GAAP facts found."
    );
  }

  const revenueFact =
    usGaap[
      "RevenueFromContractWithCustomerExcludingAssessedTax"
    ];

  const netIncomeFact =
    usGaap[
      "NetIncomeLoss"
    ];

  if (!revenueFact) {
    throw new Error(
      "Revenue fact not found."
    );
  }

  if (!netIncomeFact) {
    throw new Error(
      "Net income fact not found."
    );
  }

  const revenueValues =
    revenueFact.units?.USD ?? [];

  const netIncomeValues =
    netIncomeFact.units?.USD ?? [];

  /*
   * Find the latest 10-Q balance-sheet date
   * from the revenue facts.
   */
  const reportingDates =
    revenueValues
      .filter(
        (item: SecFact) =>
          item.form === "10-Q" &&
          item.end
      )
      .map(
        (item: SecFact) =>
          item.end as string
      );

  const latestReportingDate =
    Array.from(
      new Set(reportingDates)
    ).sort().pop();

  if (!latestReportingDate) {
    throw new Error(
      "Could not determine latest reporting date."
    );
  }

  /*
   * Find YTD revenue ending on the
   * latest reporting date.
   *
   * Apple's latest 10-Q contains:
   *
   * 3-month revenue
   * 9-month revenue
   *
   * We want the longer period.
   */
  const revenueCandidates =
    revenueValues.filter(
      (item: SecFact) =>
        item.form === "10-Q" &&
        item.end ===
          latestReportingDate &&
        item.start
    );

  const revenueWithDuration =
    revenueCandidates
      .map(
        (item: SecFact) => {
          const start =
            new Date(
              item.start as string
            ).getTime();

          const end =
            new Date(
              item.end as string
            ).getTime();

          return {
            item,
            duration:
              end - start,
          };
        }
      )
      .sort(
        (a, b) =>
          b.duration - a.duration
      );

  const ytdRevenue =
    revenueWithDuration[0]?.item;

  if (!ytdRevenue) {
    throw new Error(
      "Could not find YTD revenue."
    );
  }

  /*
   * Find YTD net income using the
   * same reporting date and choose
   * the longest available period.
   */
  const netIncomeCandidates =
    netIncomeValues.filter(
      (item: SecFact) =>
        item.form === "10-Q" &&
        item.end ===
          latestReportingDate &&
        item.start
    );

  const netIncomeWithDuration =
    netIncomeCandidates
      .map(
        (item: SecFact) => {
          const start =
            new Date(
              item.start as string
            ).getTime();

          const end =
            new Date(
              item.end as string
            ).getTime();

          return {
            item,
            duration:
              end - start,
          };
        }
      )
      .sort(
        (a, b) =>
          b.duration - a.duration
      );

  const ytdNetIncome =
    netIncomeWithDuration[0]?.item;

  if (!ytdNetIncome) {
    throw new Error(
      "Could not find YTD net income."
    );
  }

  const result = {
    companyName: data.entityName,
    cik: data.cik,

    reportingDate:
      latestReportingDate,

    incomeData: {
      totalIncome:
        ytdRevenue.val,

      netIncome:
        ytdNetIncome.val,

      impermissibleIncome:
        null,
    },

    source: {
      name:
        "SEC EDGAR Company Facts API",

      url:
        "https://data.sec.gov/api/xbrl/companyfacts/",

      filingForm:
        "10-Q",

      dataDate:
        latestReportingDate,

      revenuePeriod: {
        start:
          ytdRevenue.start,

        end:
          ytdRevenue.end,
      },

      netIncomePeriod: {
        start:
          ytdNetIncome.start,

        end:
          ytdNetIncome.end,
      },
    },
  };

  console.log(
    "\n================================"
  );

  console.log(
    "SEC YTD INCOME RESULT"
  );

  console.log(
    "================================"
  );

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    "\nSEC YTD extraction failed:",
    error
  );

  process.exit(1);
});