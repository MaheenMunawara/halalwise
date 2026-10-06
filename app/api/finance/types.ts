export type StockBusinessClassification =
  | "permissible"
  | "prohibited"
  | "mixed"
  | "unclear";

export type StockVerificationStatus =
  | "verified"
  | "pending"
  | "unverified";

export type StockScreeningResult =
  | "compliant"
  | "not_compliant"
  | "needs_review"
  | "insufficient_data";

export type Stock = {
  companyName: string;

  ticker: string;

  exchange: string;

  sector: string;

  businessActivity: {
    mainBusinessActivity: string;

    classification:
      | StockBusinessClassification;

    prohibitedActivities: string[];

    notes?: string;
  };

  financialData: {
    marketCapitalization: number;

    interestBearingDebt: number;

    interestBearingAssets:
      | number
      | null;

    totalIncome: number;

    impermissibleIncome:
      | number
      | null;
  };

  ratios: {
    debtRatio: number;

    interestBearingAssetsRatio:
      | number
      | null;

    impermissibleIncomeRatio:
      | number
      | null;
  };

  methodology: {
    name: string;

    source: string;

    sourceUrl: string;
  };

  financialDataSource: {
    name: string;

    url?: string | null;

    dataDate: string;
  };

  verification: {
    status:
      | StockVerificationStatus;

    verifiedAt?: string | null;

    verifiedBy?: string | null;
  };

  screeningResult?:
    | StockScreeningResult;

  createdAt?: Date;

  updatedAt?: Date;
};