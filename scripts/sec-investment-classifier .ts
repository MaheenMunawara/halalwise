export type InvestmentClassification =
  | "interest_taking_deposit"
  | "debt_security"
  | "equity_or_fund"
  | "unclear";

export type InvestmentCategoryInput = {
  category: string;
  amount: number;
  source: string;
  sourceDate: string;
};

export type ClassifiedInvestmentCategory =
  InvestmentCategoryInput & {
    classification: InvestmentClassification;
    includedInScreening: boolean;
    reason: string;
  };

export type InvestmentClassificationResult = {
  categories: ClassifiedInvestmentCategory[];

  includedCategories: ClassifiedInvestmentCategory[];

  excludedCategories: ClassifiedInvestmentCategory[];

  interestTakingDepositsTotal: number;

  methodology: {
    name: string;
    description: string;
    standardReference: string;
    standardUrl: string;
  };
};

/*
 * HalalWise investment classification
 *
 * Important:
 *
 * AAOIFI Standard 21 uses the concept of
 * "interest-taking deposits" for the
 * 30% asset-side test.
 *
 * Therefore we must NOT automatically classify
 * every debt security or marketable security
 * as an interest-taking deposit.
 *
 * The classifier is intentionally conservative.
 *
 * Clearly deposit-like categories can be included.
 * Other investment categories remain excluded or
 * unclear until the methodology explicitly defines
 * how they should be treated.
 */

const METHODOLOGY = {
  name: "AAOIFI Standard 21-based investment screening",
  description:
    "Conservative classification of investment categories for the interest-taking deposits test. Categories are included only when their nature is sufficiently clear from the reported financial category.",
  standardReference:
    "AAOIFI Shari'ah Standard No. 21, section 3/4/3",
  standardUrl:
    "https://aaoifi.com/download/24233/",
} as const;

function normalizeCategory(
  category: string
): string {
  return category
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function classifyInvestmentCategory(
  category: string
): {
  classification: InvestmentClassification;
  includedInScreening: boolean;
  reason: string;
} {
  const normalized =
    normalizeCategory(category);

  /*
   * Clearly deposit-like categories.
   *
   * These are the categories we can identify
   * directly from the company's financial
   * statement without guessing.
   */
  if (
    normalized.includes(
      "certificate of deposit"
    ) ||
    normalized.includes(
      "certificates of deposit"
    ) ||
    normalized.includes(
      "time deposit"
    ) ||
    normalized.includes(
      "time deposits"
    )
  ) {
    return {
      classification:
        "interest_taking_deposit",

      includedInScreening: true,

      reason:
        "The reported category explicitly identifies certificates of deposit or time deposits, which are deposit-type instruments.",
    };
  }

  /*
   * These are investment securities, but we do
   * NOT automatically treat them as deposits.
   *
   * This avoids converting every debt security
   * into an "interest-taking deposit" figure.
   */
  if (
    normalized.includes(
      "treasury"
    ) ||
    normalized.includes(
      "government security"
    ) ||
    normalized.includes(
      "government securities"
    ) ||
    normalized.includes(
      "agency security"
    ) ||
    normalized.includes(
      "agency securities"
    ) ||
    normalized.includes(
      "commercial paper"
    ) ||
    normalized.includes(
      "corporate debt"
    ) ||
    normalized.includes(
      "mortgage"
    ) ||
    normalized.includes(
      "asset-backed"
    ) ||
    normalized.includes(
      "debt security"
    ) ||
    normalized.includes(
      "debt securities"
    )
  ) {
    return {
      classification:
        "debt_security",

      includedInScreening: false,

      reason:
        "The category is a debt or fixed-income security, but it is not automatically classified as an interest-taking deposit under the selected methodology.",
    };
  }

  /*
   * Funds and equity-like investments are not
   * automatically included in the deposit test.
   */
  if (
    normalized.includes(
      "money market fund"
    ) ||
    normalized.includes(
      "money market funds"
    ) ||
    normalized.includes(
      "mutual fund"
    ) ||
    normalized.includes(
      "mutual funds"
    ) ||
    normalized.includes(
      "equity"
    ) ||
    normalized.includes(
      "stock"
    ) ||
    normalized.includes(
      "stocks"
    )
  ) {
    return {
      classification:
        "equity_or_fund",

      includedInScreening: false,

      reason:
        "The reported category is an equity or fund investment rather than an explicitly identified deposit.",
    };
  }

  /*
   * Unknown categories must not silently enter
   * the screening calculation.
   */
  return {
    classification: "unclear",

    includedInScreening: false,

    reason:
      "The category could not be confidently classified as an interest-taking deposit from the available description.",
  };
}

export function classifyInvestmentCategories(
  categories: InvestmentCategoryInput[]
): InvestmentClassificationResult {
  const classified =
    categories.map(
      (category) => {
        const classification =
          classifyInvestmentCategory(
            category.category
          );

        return {
          ...category,
          ...classification,
        };
      }
    );

  const includedCategories =
    classified.filter(
      (category) =>
        category.includedInScreening
    );

  const excludedCategories =
    classified.filter(
      (category) =>
        !category.includedInScreening
    );

  const interestTakingDepositsTotal =
    includedCategories.reduce(
      (total, category) =>
        total + category.amount,
      0
    );

  return {
    categories: classified,

    includedCategories,

    excludedCategories,

    interestTakingDepositsTotal,

    methodology: METHODOLOGY,
  };
}