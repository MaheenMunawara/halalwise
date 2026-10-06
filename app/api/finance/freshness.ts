export type DataFreshnessStatus =
  | "fresh"
  | "aging"
  | "stale"
  | "unknown";

export function calculateDataFreshness(
  dataDate: string | undefined | null
) {
  if (!dataDate) {
    return {
      status: "unknown" as DataFreshnessStatus,
      ageInDays: null,
      message: "The financial data date is unavailable.",
    };
  }

  const parsedDate = new Date(dataDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return {
      status: "unknown" as DataFreshnessStatus,
      ageInDays: null,
      message: "The financial data date is invalid.",
    };
  }

  const now = new Date();

  const difference =
    now.getTime() - parsedDate.getTime();

  const ageInDays = Math.floor(
    difference / (1000 * 60 * 60 * 24)
  );

  if (ageInDays < 0) {
    return {
      status: "unknown" as DataFreshnessStatus,
      ageInDays,
      message: "The financial data date is in the future.",
    };
  }

  if (ageInDays <= 90) {
    return {
      status: "fresh" as DataFreshnessStatus,
      ageInDays,
      message: "The financial data is relatively recent.",
    };
  }

  if (ageInDays <= 180) {
    return {
      status: "aging" as DataFreshnessStatus,
      ageInDays,
      message: "The financial data is becoming outdated.",
    };
  }

  return {
    status: "stale" as DataFreshnessStatus,
    ageInDays,
    message:
      "The financial data is older and should be reviewed before relying on the screening result.",
  };
}