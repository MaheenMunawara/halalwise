
import { financeCompanyUniverse } from "./finance-company-universe.ts";

export type FinanceCompanyInput = {
  companyName: string;
  ticker: string;
  fmpSymbol: string | null;
  exchange: string;
  country: "India" | "USA";
  sector: string;

  businessActivity: {
    mainBusinessActivity: string;
    classification:
      | "permissible"
      | "prohibited"
      | "mixed"
      | "unclear";
    prohibitedActivities: string[];
  };

  financialData: {
    marketCapitalization: number | null;
    interestBearingDebt: number | null;
    interestBearingAssets: number | null;
    totalIncome: number | null;
    impermissibleIncome: number | null;
  };

  methodology: {
    name: string;
    version: string | null;
    notes: string;
  };

  financialDataSource: {
    name: string;
    url: string;
    dataDate: string | null;
  };

  verification: {
    status: "verified" | "pending" | "unverified";
    verifiedBy: string | null;
    verifiedAt: string | null;
    verificationNotes: string | null;
  };
};

const fmpSymbols: Record<string, string> = {
  TCS: "TCS.NS",
  INFY: "INFY.NS",
  HCLTECH: "HCLTECH.NS",
  WIPRO: "WIPRO.NS",
  TATAMOTORS: "TATAMOTORS.NS",

  AAPL: "AAPL",
  MSFT: "MSFT",
  NVDA: "NVDA",
  GOOGL: "GOOGL",
  AMZN: "AMZN",
};

const businessActivityOverrides: Record<
  string,
  FinanceCompanyInput["businessActivity"]
> = {
  TCS: {
    mainBusinessActivity:
      "Provides IT services, consulting, digital transformation, business solutions, cloud services, cybersecurity, data and analytics, artificial intelligence, and related technology services.",

    classification: "permissible",

    prohibitedActivities: [],
  },

  AAPL: {
    mainBusinessActivity:
      "Designs, manufactures, and markets smartphones, personal computers, tablets, wearables, accessories, software, cloud services, digital content, advertising services, and payment services.",

    classification: "mixed",

    prohibitedActivities: [],
  },

  NVDA: {
    mainBusinessActivity:
      "Provides accelerated computing, AI infrastructure, data-center platforms, graphics processors, gaming products, professional visualization, automotive platforms, robotics, and related software.",

    classification: "permissible",

    prohibitedActivities: [],
  },

  GOOGL: {
    mainBusinessActivity:
      "Operates Google Services and Google Cloud, including search, advertising, Android, Chrome, devices, Maps, Play, YouTube, cloud infrastructure and platform services, and other technology businesses.",

    classification: "mixed",

    prohibitedActivities: [],
  },

  AMZN: {
    mainBusinessActivity:
      "Operates online and physical retail stores, Amazon Web Services, advertising services, subscription services, electronic devices, digital content and media services, and third-party seller platforms.",

    classification: "mixed",

    prohibitedActivities: [],
  },
};

export const financeCompanies: FinanceCompanyInput[] =
  financeCompanyUniverse.map((company) => {
    const businessActivity =
      businessActivityOverrides[company.ticker] ?? {
        mainBusinessActivity:
          "Business activity requires Shariah-specific review before screening.",

        classification: "unclear" as const,

        prohibitedActivities: [],
      };

    return {
      companyName: company.companyName,

      ticker: company.ticker,

      fmpSymbol:
        fmpSymbols[company.ticker] ?? null,

      exchange: company.exchange,

      country: company.country,

      sector: company.sector,

      businessActivity,

      financialData: {
        marketCapitalization: null,

        interestBearingDebt: null,

        interestBearingAssets: null,

        totalIncome: null,

        impermissibleIncome: null,
      },

      methodology: {
        name: "AAOIFI Shariah Standard-based",

        version: null,

        notes:
          "Business activity classification is based on documented company business descriptions and is subject to Shariah methodology review. It is not a personal fatwa or definitive investment ruling.",
      },

      financialDataSource: {
        name:
          "Pending validated financial data source",

        url: "",

        dataDate: null,
      },

      verification: {
        status: "pending",

        verifiedBy: null,

        verifiedAt: null,

        verificationNotes:
          "Financial data sources have been identified, but the record has not yet completed the HalalWise verification review.",
      },
    };
  });

