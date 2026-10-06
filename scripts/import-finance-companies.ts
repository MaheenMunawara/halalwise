
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

import {
  calculateFinancialRatios,
  validateFinancialData,
  validateBusinessActivity,
} from "../app/api/finance/validation.ts";

import { screenStock } from "../app/api/finance/screening.ts";

import { financeCompanies } from "./finance-companies.ts";
import { secCompanies } from "./sec-companies.ts";
import { getHistoricalMarketCap } from "./fmp-market-cap.ts";
import { getHistoricalNseMarketCap } from "./nse-market-cap.ts";
import {
  fetchNseFinancials,
} from "./nse-financials.ts";

dotenv.config({
  path: ".env.local",
});

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error(
    "MONGODB_URI is not defined"
  );
}

type FactValue = {
  val: number;
  start?: string;
  end?: string;
  filed: string;
  form: string;
  frame?: string;
};

const nseFilingUrls: Record<
  string,
  string
> = {
  TCS:
    "https://nsearchives.nseindia.com/corporate/ixbrl/INTEGRATED_FILING_INDAS_173420_09072026183620_iXBRL_WEB.html",

  INFY:
    "https://nsearchives.nseindia.com/corporate/ixbrl/INTEGRATED_FILING_INDAS_152465_23042026210154_iXBRL_WEB.html",
};

/*
 * Temporary market-cap data.
 *
 * We are keeping the already-tested TCS value temporarily.
 * We will replace this with a reusable NSE historical
 * market-cap source instead of manually adding every company.
 */
const nseMarketCaps: Record<
  string,
  {
    marketCapitalization: number;
    dataDate: string;
    source: string;
  }
> = {
  TCS: {
    marketCapitalization:
      758697.5 * 10000000,

    dataDate:
      "2026-06-30",

    source:
      "NSE historical market-cap data",
  },
};

function getUnits(fact: any) {
  if (!fact?.units) {
    return [];
  }

  const units = fact.units;

  const unitName =
    units.USD
      ? "USD"
      : Object.keys(units)[0];

  if (!unitName) {
    return [];
  }

  return units[unitName].map(
    (item: FactValue) => ({
      ...item,
      unit: unitName,
    })
  );
}

function get10QValues(fact: any) {
  return getUnits(fact).filter(
    (item: any) =>
      item.form === "10-Q" &&
      item.end &&
      Number.isFinite(item.val)
  );
}

function getLatestValueForConcepts(
  usGaap: any,
  concepts: string[],
  type:
    | "instant"
    | "duration"
) {
  const candidates: any[] = [];

  for (const concept of concepts) {
    const fact = usGaap[concept];

    if (!fact) {
      continue;
    }

    for (const value of get10QValues(
      fact
    )) {
      const isInstant =
        value.start == null &&
        value.end != null;

      const isDuration =
        value.start != null &&
        value.end != null;

      if (
        (type === "instant" &&
          !isInstant) ||
        (type === "duration" &&
          !isDuration)
      ) {
        continue;
      }

      candidates.push({
        concept,
        value: value.val,
        start:
          value.start ?? null,
        end: value.end,
        filed: value.filed,
        form: value.form,
        frame:
          value.frame ?? null,
        unit:
          value.unit ?? null,
      });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => {
    const endDifference =
      new Date(b.end).getTime() -
      new Date(a.end).getTime();

    if (endDifference !== 0) {
      return endDifference;
    }

    const filedDifference =
      new Date(b.filed).getTime() -
      new Date(a.filed).getTime();

    if (filedDifference !== 0) {
      return filedDifference;
    }

    if (
      type === "duration" &&
      a.start &&
      b.start
    ) {
      return (
        new Date(a.start).getTime() -
        new Date(b.start).getTime()
      );
    }

    return (
      concepts.indexOf(a.concept) -
      concepts.indexOf(b.concept)
    );
  });

  return candidates[0];
}

async function fetchCompanyFacts(
  cik: string
) {
  const url =
    "https://data.sec.gov/api/xbrl/companyfacts/CIK" +
    cik +
    ".json";

  const response = await fetch(
    url,
    {
      headers: {
        "User-Agent":
          "HalalWise/1.0 contact@halalwise.com",

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

  return response.json();
}

async function getSecFinancialData(
  ticker: string
) {
  const secCompany =
    secCompanies.find(
      (company) =>
        company.ticker === ticker
    );

  if (!secCompany) {
    return null;
  }

  const data =
    await fetchCompanyFacts(
      secCompany.cik
    );

  const usGaap =
    data.facts?.["us-gaap"];

  if (!usGaap) {
    throw new Error(
      `No US-GAAP facts found for ${ticker}.`
    );
  }

  const revenue =
    getLatestValueForConcepts(
      usGaap,
      [
        "RevenueFromContractWithCustomerExcludingAssessedTax",
        "Revenues",
      ],
      "duration"
    );

  const assets =
    getLatestValueForConcepts(
      usGaap,
      ["Assets"],
      "instant"
    );

  const equity =
    getLatestValueForConcepts(
      usGaap,
      ["StockholdersEquity"],
      "instant"
    );

  const cash =
    getLatestValueForConcepts(
      usGaap,
      [
        "CashAndCashEquivalentsAtCarryingValue",
      ],
      "instant"
    );

  const netIncome =
    getLatestValueForConcepts(
      usGaap,
      ["NetIncomeLoss"],
      "duration"
    );

  const longTermDebt =
    getLatestValueForConcepts(
      usGaap,
      ["LongTermDebt"],
      "instant"
    );

  const longTermDebtCurrent =
    getLatestValueForConcepts(
      usGaap,
      ["LongTermDebtCurrent"],
      "instant"
    );

  const longTermDebtNoncurrent =
    getLatestValueForConcepts(
      usGaap,
      ["LongTermDebtNoncurrent"],
      "instant"
    );

  const shortTermBorrowings =
    getLatestValueForConcepts(
      usGaap,
      ["ShortTermBorrowings"],
      "instant"
    );

  const marketableSecuritiesCurrent =
    getLatestValueForConcepts(
      usGaap,
      ["MarketableSecuritiesCurrent"],
      "instant"
    );

  const marketableSecuritiesNoncurrent =
    getLatestValueForConcepts(
      usGaap,
      [
        "MarketableSecuritiesNoncurrent",
      ],
      "instant"
    );

  const investmentIncomeInterest =
    getLatestValueForConcepts(
      usGaap,
      [
        "InvestmentIncomeInterest",
        "InterestIncomeOther",
      ],
      "duration"
    );

  const reportingDate =
    revenue?.end ??
    assets?.end ??
    null;

  let interestBearingDebt:
    number | null = null;

  if (
    longTermDebt?.value != null
  ) {
    interestBearingDebt =
      longTermDebt.value;
  } else if (
    longTermDebtCurrent?.value != null &&
    longTermDebtNoncurrent?.value !=
      null
  ) {
    interestBearingDebt =
      longTermDebtCurrent.value +
      longTermDebtNoncurrent.value;
  } else if (
    shortTermBorrowings?.value != null
  ) {
    interestBearingDebt =
      shortTermBorrowings.value;
  }

  return {
    totalIncome:
      revenue?.value ?? null,

    assets:
      assets?.value ?? null,

    stockholdersEquity:
      equity?.value ?? null,

    cash:
      cash?.value ?? null,

    netIncome:
      netIncome?.value ?? null,

    longTermDebt:
      longTermDebt?.value ?? null,

    longTermDebtCurrent:
      longTermDebtCurrent?.value ??
      null,

    longTermDebtNoncurrent:
      longTermDebtNoncurrent?.value ??
      null,

    shortTermBorrowings:
      shortTermBorrowings?.value ??
      null,

    marketableSecuritiesCurrent:
      marketableSecuritiesCurrent?.value ??
      null,

    marketableSecuritiesNoncurrent:
      marketableSecuritiesNoncurrent?.value ??
      null,

    marketCapitalization: null,

    interestBearingDebt,

    interestBearingAssets: null,

    impermissibleIncome: null,

    dataDate: reportingDate,

    researchData: {
      revenueConcept:
        revenue?.concept ?? null,

      revenueStart:
        revenue?.start ?? null,

      revenueEnd:
        revenue?.end ?? null,

      revenueFiled:
        revenue?.filed ?? null,

      investmentIncomeInterest:
        investmentIncomeInterest?.value ??
        null,

      investmentIncomeInterestConcept:
        investmentIncomeInterest?.concept ??
        null,
    },
  };
}

async function main() {
  const client =
    new MongoClient(uri);

  try {
    await client.connect();

    const db =
      client.db("halalwise");

    const collection =
      db.collection(
        "finance_companies"
      );

    console.log(
      `Starting finance import for ${financeCompanies.length} companies...`
    );

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const company of financeCompanies) {
      console.log(
        `\nProcessing ${company.companyName} (${company.ticker})...`
      );

      try {
        let secFinancialData =
          null;

        let nseFinancialData =
          null;

        /*
         * USA financial data
         */
        if (
          company.country === "USA"
        ) {
          secFinancialData =
            await getSecFinancialData(
              company.ticker
            );

          if (!secFinancialData) {
            console.log(
              "SEC data not available for this company."
            );
          }
        }

        /*
         * India financial data
         */
        if (
          company.country === "India"
        ) {
          const filingUrl =
            nseFilingUrls[
              company.ticker
            ];

          if (filingUrl) {
            nseFinancialData =
              await fetchNseFinancials(
                company.ticker,
                filingUrl
              );

            console.log(
              `NSE reporting date: ${
                nseFinancialData
                  .reportingDate ??
                "not available"
              }`
            );

            console.log(
              `NSE total income: ${
                nseFinancialData
                  .totalIncome ??
                "not available"
              }`
            );

            console.log(
              `NSE finance costs: ${
                nseFinancialData
                  .financeCosts ??
                "not available"
              }`
            );
          } else {
            console.log(
              "NSE filing URL not configured for this company."
            );
          }
        }

        /*
         * Market capitalization
         */
        let marketCapResult:
          | {
              marketCap: number | null;
              marketCapDate:
                | string
                | null;
              requestedDate: string;
              source: string;
            }
          | null = null;

        /*
         * USA market capitalization
         */
        if (
          company.country === "USA" &&
          secFinancialData?.dataDate
        ) {
          marketCapResult =
            await getHistoricalMarketCap(
              company.ticker,
              secFinancialData.dataDate
            );

          console.log(
            `Market cap date: ${
              marketCapResult
                .marketCapDate ??
              "not available"
            }`
          );

          console.log(
            `Market cap: ${
              marketCapResult
                .marketCap ??
              "not available"
            }`
          );
        }

        /*
         * Temporary India market capitalization.
         *
         * This is intentionally limited to the
         * already-tested TCS value.
         *
         * We will replace this with a reusable
         * NSE historical market-cap source.
         */
        if (
          company.country === "India"
        ) {
          const nseMarketCap =
            nseMarketCaps[
              company.ticker
            ];

          if (nseMarketCap) {
            marketCapResult = {
              marketCap:
                nseMarketCap
                  .marketCapitalization,

              marketCapDate:
                nseMarketCap.dataDate,

              requestedDate:
                nseMarketCap.dataDate,

              source:
                nseMarketCap.source,
            };

            console.log(
              `NSE market cap date: ${
                nseMarketCap.dataDate
              }`
            );

            console.log(
              `NSE market cap: ${
                nseMarketCap
                  .marketCapitalization
              }`
            );
          }
        }

        const financialData = {
          ...company.financialData,

          totalIncome:
            secFinancialData?.totalIncome ??
            nseFinancialData?.totalIncome ??
            company.financialData
              .totalIncome,

          interestBearingDebt:
            secFinancialData?.interestBearingDebt ??
            company.financialData
              .interestBearingDebt,

          interestBearingAssets:
            secFinancialData?.interestBearingAssets ??
            company.financialData
              .interestBearingAssets,

          impermissibleIncome:
            secFinancialData?.impermissibleIncome ??
            company.financialData
              .impermissibleIncome,

          dataDate:
            secFinancialData?.dataDate ??
            (
              nseFinancialData
                ?.reportingDate
                ? nseFinancialData
                    .reportingDate
                    .split("-")
                    .reverse()
                    .join("-")
                : null
            ),

          marketCapitalization:
            marketCapResult
              ?.marketCap ??
            company.financialData
              .marketCapitalization,
        };

        const financialValidation =
          validateFinancialData(
            {
              marketCapitalization:
                financialData
                  .marketCapitalization,

              interestBearingDebt:
                financialData
                  .interestBearingDebt,

              interestBearingAssets:
                financialData
                  .interestBearingAssets,

              totalIncome:
                financialData
                  .totalIncome,

              impermissibleIncome:
                financialData
                  .impermissibleIncome,

              dataDate:
                financialData.dataDate,
            },
            {
              allowIncomplete: true,
            }
          );

        if (
          !financialValidation.valid
        ) {
          console.log(
            "SKIPPED: Financial validation failed."
          );

          console.log(
            financialValidation.errors
          );

          skipped++;
          continue;
        }

        const businessValidation =
          validateBusinessActivity({
            mainBusinessActivity:
              company.businessActivity
                .mainBusinessActivity,

            businessClassification:
              company.businessActivity
                .classification,

            prohibitedActivities:
              company.businessActivity
                .prohibitedActivities,
          });

        if (
          !businessValidation.valid
        ) {
          console.log(
            "SKIPPED: Business activity validation failed."
          );

          console.log(
            businessValidation.errors
          );

          skipped++;
          continue;
        }

        const ratios =
          calculateFinancialRatios({
            marketCapitalization:
              financialData
                .marketCapitalization,

            interestBearingDebt:
              financialData
                .interestBearingDebt,

            interestBearingAssets:
              financialData
                .interestBearingAssets,

            totalIncome:
              financialData.totalIncome,

            impermissibleIncome:
              financialData
                .impermissibleIncome,
          });

        const screeningResult =
          screenStock({
            businessClassification:
              company.businessActivity
                .classification,

            debtRatio:
              ratios.debtRatio,

            interestBearingAssetsRatio:
              ratios
                .interestBearingAssetsRatio,

            impermissibleIncomeRatio:
              ratios
                .impermissibleIncomeRatio,
          });

        const ticker =
          company.ticker
            .trim()
            .toUpperCase();

        const exchange =
          company.exchange
            .trim()
            .toUpperCase();

        const now =
          new Date();

        const document = {
          companyName:
            company.companyName.trim(),

          ticker,

          exchange,

          sector:
            company.sector.trim(),

          businessActivity: {
            ...company.businessActivity,
          },

          financialData,

          ratios,

          screeningResult:
            screeningResult.result,

          screeningChecks:
            screeningResult.checks,

          methodology:
            company.methodology,

          financialDataSource: {
            name:
              secFinancialData
                ? "SEC EDGAR Company Facts API + Financial Modeling Prep"
                : nseFinancialData
                ? "NSE Integrated Filing - Financials"
                : company
                    .financialDataSource
                    .name,

            url:
              secFinancialData
                ? "https://data.sec.gov/api/xbrl/companyfacts/"
                : nseFinancialData
                ? nseFinancialData
                    .sourceUrl
                : company
                    .financialDataSource
                    .url,

            dataDate:
              financialData.dataDate,
          },

          marketCapitalizationSource:
            marketCapResult
              ? {
                  name:
                    marketCapResult.source,

                  url:
                    marketCapResult.source ===
                    "NSE historical market-cap data"
                      ? "https://www.nseindia.com/"
                      : "https://site.financialmodelingprep.com/developer/docs/stable/historical-market-cap",

                  dataDate:
                    marketCapResult
                      .marketCapDate,

                  requestedDate:
                    marketCapResult
                      .requestedDate,
                }
              : null,

          verification:
            company.verification,

          updatedAt: now,
        };

        const existing =
          await collection.findOne({
            ticker,
            exchange,
          });

        await collection.updateOne(
          {
            ticker,
            exchange,
          },
          {
            $set: document,

            $setOnInsert: {
              createdAt: now,
            },
          },
          {
            upsert: true,
          }
        );

        if (existing) {
          updated++;

          console.log(
            `UPDATED: ${company.companyName}`
          );
        } else {
          created++;

          console.log(
            `CREATED: ${company.companyName}`
          );
        }

        console.log(
          `Interest-bearing debt: ${
            financialData
              .interestBearingDebt ??
            "not available"
          }`
        );

        console.log(
          `Interest-bearing assets: ${
            financialData
              .interestBearingAssets ??
            "not available"
          }`
        );

        console.log(
          `Impermissible income: ${
            financialData
              .impermissibleIncome ??
            "not available"
          }`
        );

        console.log(
          `Market capitalization: ${
            financialData
              .marketCapitalization ??
            "not available"
          }`
        );

        console.log(
          `Screening result: ${
            screeningResult.result
          }`
        );
      } catch (error) {
        skipped++;

        console.error(
          `FAILED: ${company.companyName}`,
          error
        );
      }
    }

    console.log(
      "\n=============================="
    );

    console.log(
      "FINANCE IMPORT COMPLETE"
    );

    console.log(
      "=============================="
    );

    console.log(
      `Created: ${created}`
    );

    console.log(
      `Updated: ${updated}`
    );

    console.log(
      `Skipped: ${skipped}`
    );

    console.log(
      `Total input: ${financeCompanies.length}`
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(
    "Finance import failed:",
    error
  );

  process.exit(1);
});
