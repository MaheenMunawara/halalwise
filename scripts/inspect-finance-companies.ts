import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
const envFile = fs.readFileSync(envPath, "utf8");

for (const line of envFile.split(/\r?\n/)) {
  const trimmed = line.trim();

  if (
    !trimmed ||
    trimmed.startsWith("#") ||
    !trimmed.includes("=")
  ) {
    continue;
  }

  const separatorIndex = trimmed.indexOf("=");

  const key = trimmed
    .slice(0, separatorIndex)
    .trim();

  const value = trimmed
    .slice(separatorIndex + 1)
    .trim()
    .replace(/^["']|["']$/g, "");

  if (key && !process.env[key]) {
    process.env[key] = value;
  }
}

const { default: clientPromise } = await import(
  "../lib/mongodb.ts"
);

async function inspectFinanceCompanies() {
  const client = await clientPromise;

  try {
    const db = client.db("halalwise");

    const companies = await db
      .collection("finance_companies")
      .find(
        {},
        {
          projection: {
            _id: 0,
            companyName: 1,
            ticker: 1,
            exchange: 1,
            "businessActivity.classification": 1,
            screeningResult: 1,
            "verification.status": 1,
            "verification.verifiedBy": 1,
            "verification.verifiedAt": 1,
            "financialDataSource.dataDate": 1,
          },
        }
      )
      .sort({ ticker: 1 })
      .toArray();

    console.log(
      "\n========== FINANCE COMPANIES ==========\n"
    );

    if (companies.length === 0) {
      console.log("No finance companies found.");
      return;
    }

    companies.forEach((company, index) => {
      console.log(`${index + 1}. ${company.companyName}`);
      console.log(`   Ticker: ${company.ticker}`);
      console.log(
        `   Exchange: ${company.exchange ?? "Unavailable"}`
      );
      console.log(
        `   Business classification: ${
          company.businessActivity?.classification ??
          "Unavailable"
        }`
      );
      console.log(
        `   Screening result: ${
          company.screeningResult ?? "Unavailable"
        }`
      );
      console.log(
        `   Verification status: ${
          company.verification?.status ??
          "Unavailable"
        }`
      );
      console.log(
        `   Verified by: ${
          company.verification?.verifiedBy ??
          "Not verified"
        }`
      );
      console.log(
        `   Financial data date: ${
          company.financialDataSource?.dataDate ??
          "Unavailable"
        }`
      );
      console.log("");
    });

    console.log(
      `Total companies: ${companies.length}`
    );

    console.log(
      "\n=======================================\n"
    );
  } catch (error) {
    console.error(
      "Failed to inspect finance companies:",
      error
    );
  } finally {
    await client.close();
  }
}

inspectFinanceCompanies();