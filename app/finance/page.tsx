"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type StockSearchResult = {
  companyName: string;
  ticker: string;
  exchange: string;
  sector: string;
};

type CompanyResult = {
  dataFreshness?: {
    status: string;
    ageInDays: number | null;
    message: string;
  };
  success: boolean;
  company?: {
    companyName: string;
    ticker: string;
    exchange: string;
    sector: string;
  };
  businessActivity?: {
    mainBusinessActivity: string;
    classification: string;
    prohibitedActivities: string[];
    notes?: string;
  };
  financialData?: {
    marketCapitalization: number | null;
    interestBearingDebt: number | null;
    interestBearingAssets: number | null;
    totalIncome: number | null;
    impermissibleIncome: number | null;
  };
  ratios?: {
    debtRatio: number | null;
    interestBearingAssetsRatio: number | null;
    impermissibleIncomeRatio: number | null;
  };
  methodology?: {
    name: string;
    source: string;
    sourceUrl: string;
  };
  financialDataSource?: {
    name?: string;
    url?: string | null;
    dataDate?: string;
  };
  verification?: {
    status?: string;
    verifiedAt?: string | null;
    verifiedBy?: string | null;
  };
  screeningResult?: string;
  explanation?: {
    summary?: string;
    checks?: {
      businessActivity: {
        status: string;
        message: string;
      };
      debtRatio: {
        status: string;
        message: string;
      };
      interestBearingAssets: {
        status: string;
        message: string;
      };
      impermissibleIncome: {
        status: string;
        message: string;
      };
    };
  };
  dataQuality?: {
    hasMissingRequiredData: boolean;
    status: string;
  };
  error?: string;
};

export default function FinancePage() {
  const searchParams = useSearchParams();
  const urlSymbol = searchParams.get("symbol");

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    StockSearchResult[]
  >([]);
  const [selectedTicker, setSelectedTicker] = useState("");
  const [result, setResult] = useState<CompanyResult | null>(
    null
  );

  const [searching, setSearching] = useState(false);
  const [loadingCompany, setLoadingCompany] = useState(false);

  const [savingWatchlist, setSavingWatchlist] =
    useState(false);

  const [watchlistSaved, setWatchlistSaved] =
    useState(false);

  const [watchlistMessage, setWatchlistMessage] =
    useState("");

  const [watchlistSymbols, setWatchlistSymbols] =
    useState<string[]>([]);

  useEffect(() => {
    const loadWatchlist = async () => {
      try {
        const response = await fetch(
          "/api/stock-watchlist"
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (data.success) {
          setWatchlistSymbols(
            (data.watchlist || []).map(
              (item: { symbol: string }) =>
                item.symbol.toUpperCase()
            )
          );
        }
      } catch {
        // Watchlist loading is optional for Finance browsing.
      }
    };

    loadWatchlist();
  }, []);

  useEffect(() => {
    const ticker = result?.company?.ticker;

    if (!ticker) {
      return;
    }

    setWatchlistSaved(
      watchlistSymbols.includes(
        ticker.toUpperCase()
      )
    );
  }, [result, watchlistSymbols]);

  useEffect(() => {
    if (!urlSymbol) {
      return;
    }

    const symbol = urlSymbol.trim().toUpperCase();

    if (!symbol) {
      return;
    }

    setQuery(symbol);
  }, [urlSymbol]);

  useEffect(() => {
    const searchStocks = async () => {
      const trimmedQuery = query.trim();

      if (!trimmedQuery) {
        setSearchResults([]);
        return;
      }

      if (trimmedQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearching(true);

      try {
        const response = await fetch(
          `/api/finance/stocks?q=${encodeURIComponent(
            trimmedQuery
          )}`
        );

        const data = await response.json();

        if (data.success) {
          setSearchResults(data.stocks || []);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    const timer = setTimeout(
      searchStocks,
      300
    );

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!urlSymbol) {
      return;
    }

    const symbol = urlSymbol.trim().toUpperCase();

    if (!symbol) {
      return;
    }

    if (searchResults.length === 0) {
      return;
    }

    const matchingStock = searchResults.find(
      (stock) =>
        stock.ticker.toUpperCase() === symbol
    );

    if (!matchingStock) {
      return;
    }

    if (selectedTicker === matchingStock.ticker) {
      return;
    }

    selectStock(matchingStock.ticker);
  }, [
    searchResults,
    urlSymbol,
    selectedTicker,
  ]);

  const selectStock = async (ticker: string) => {
    setSelectedTicker(ticker);
    setQuery(ticker);
    setSearchResults([]);
    setLoadingCompany(true);
    setResult(null);
    setWatchlistSaved(false);
    setWatchlistMessage("");

    try {
      const response = await fetch(
        `/api/finance/company?ticker=${encodeURIComponent(
          ticker
        )}`
      );

      const data = await response.json();

      setResult(data);
    } catch {
      setResult({
        success: false,
        error:
          "Unable to load stock information.",
      });
    } finally {
      setLoadingCompany(false);
    }
  };

  const addToWatchlist = async () => {
    if (!result?.company) {
      return;
    }

    setSavingWatchlist(true);
    setWatchlistMessage("");

    try {
      const response = await fetch(
        "/api/stock-watchlist",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            symbol: result.company.ticker,
            companyName:
              result.company.companyName,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (response.status === 401) {
          setWatchlistMessage(
            "Please log in to save stocks to your watchlist."
          );
        } else {
          setWatchlistMessage(
            data.error ||
              "Unable to save this stock."
          );
        }

        return;
      }

      const ticker =
        result.company.ticker.toUpperCase();

      setWatchlistSaved(true);

      setWatchlistSymbols((current) =>
        current.includes(ticker)
          ? current
          : [...current, ticker]
      );

      if (data.alreadySaved) {
        setWatchlistMessage(
          "This stock is already in your watchlist."
        );
      } else {
        setWatchlistMessage(
          "Stock added to your watchlist."
        );
      }
    } catch {
      setWatchlistMessage(
        "Unable to save this stock right now."
      );
    } finally {
      setSavingWatchlist(false);
    }
  };

  const getResultLabel = (value?: string) => {
    switch (value) {
      case "compliant":
        return "Compliant";

      case "not_compliant":
        return "Not Compliant";

      case "needs_review":
        return "Needs Review";

      case "insufficient_data":
        return "Insufficient Data";

      default:
        return "Unavailable";
    }
  };

  const getCheckLabel = (status?: string) => {
    switch (status) {
      case "pass":
        return "Pass";

      case "fail":
        return "Fail";

      case "review":
        return "Review";

      case "unavailable":
        return "Unavailable";

      default:
        return "Unavailable";
    }
  };

  const formatRatio = (
    value: number | null | undefined
  ) => {
    if (
      value === null ||
      value === undefined ||
      !Number.isFinite(value)
    ) {
      return "Unavailable";
    }

    return `${value}%`;
  };

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900">
            Halal Finance
          </h1>

          <p className="mt-3 text-gray-600">
            Search for a stock and view its Shariah
            screening information.
          </p>
        </div>

        <section className="relative mx-auto max-w-2xl">
          <label
            htmlFor="stock-search"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Search company or ticker
          </label>

          <input
            id="stock-search"
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedTicker("");
              setResult(null);
              setWatchlistSaved(false);
              setWatchlistMessage("");
            }}
            placeholder="Example: HWTEST"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-gray-500"
          />

          {searching && (
            <p className="mt-2 text-sm text-gray-500">
              Searching...
            </p>
          )}

          {searchResults.length > 0 && (
            <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
              {searchResults.map((stock) => (
                <button
                  key={stock.ticker}
                  type="button"
                  onClick={() =>
                    selectStock(stock.ticker)
                  }
                  className="block w-full border-b border-gray-100 px-4 py-4 text-left last:border-b-0 hover:bg-gray-50"
                >
                  <div className="font-semibold text-gray-900">
                    {stock.companyName}
                  </div>

                  <div className="mt-1 text-sm text-gray-500">
                    {stock.ticker} ·{" "}
                    {stock.exchange} ·{" "}
                    {stock.sector}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!searching &&
            query.trim().length >= 2 &&
            searchResults.length === 0 &&
            !selectedTicker && (
              <p className="mt-2 text-sm text-gray-500">
                No matching stocks found.
              </p>
            )}
        </section>

        {loadingCompany && (
          <div className="mx-auto mt-10 max-w-4xl rounded-xl border border-gray-200 bg-white p-6 text-center">
            <p className="text-gray-600">
              Loading stock information...
            </p>
          </div>
        )}

        {result && !loadingCompany && (
          <section className="mx-auto mt-10 max-w-4xl space-y-6">
            {!result.success ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                <h2 className="text-lg font-semibold text-red-800">
                  Unable to load stock
                </h2>

                <p className="mt-2 text-sm text-red-700">
                  {result.error ||
                    "Something went wrong."}
                </p>
              </div>
            ) : (
              <>
                {result.company && (
                  <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          {
                            result.company
                              .companyName
                          }
                        </h2>

                        <div className="mt-2 text-gray-600">
                          {
                            result.company
                              .ticker
                          }{" "}
                          ·{" "}
                          {
                            result.company
                              .exchange
                          }{" "}
                          ·{" "}
                          {
                            result.company
                              .sector
                          }
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={
                          addToWatchlist
                        }
                        disabled={
                          savingWatchlist ||
                          watchlistSaved
                        }
                        className="shrink-0 rounded-xl border border-emerald-600 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingWatchlist
                          ? "Saving..."
                          : watchlistSaved
                            ? "✓ Saved"
                            : "⭐ Add to Watchlist"}
                      </button>
                    </div>

                    {watchlistMessage && (
                      <p className="mt-4 text-sm text-gray-600">
                        {
                          watchlistMessage
                        }
                      </p>
                    )}
                  </div>
                )}

                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Shariah Screening Result
                  </h2>

                  <div className="mt-4">
                    <p className="text-3xl font-bold text-gray-900">
                      {getResultLabel(
                        result.screeningResult
                      )}
                    </p>
                  </div>

                  {result.dataQuality
                    ?.hasMissingRequiredData && (
                    <div className="mt-5 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                      <p className="font-semibold text-yellow-800">
                        Some required financial
                        information is missing.
                      </p>

                      <p className="mt-1 text-sm text-yellow-700">
                        This result should not
                        be treated as a complete
                        Shariah screening decision.
                      </p>
                    </div>
                  )}

                  {result.explanation
                    ?.summary && (
                    <p className="mt-4 text-gray-600">
                      {
                        result.explanation
                          .summary
                      }
                    </p>
                  )}
                </div>

                {result.explanation?.checks && (
                  <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Screening Checks
                    </h2>

                    <div className="mt-5 space-y-4">
                      <div className="border-b border-gray-100 pb-4">
                        <div className="flex items-center justify-between gap-4">
                          <h3 className="font-semibold text-gray-900">
                            Business Activity
                          </h3>

                          <span className="text-sm font-medium">
                            {getCheckLabel(
                              result
                                .explanation
                                .checks
                                .businessActivity
                                .status
                            )}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-gray-600">
                          {
                            result
                              .explanation
                              .checks
                              .businessActivity
                              .message
                          }
                        </p>
                      </div>

                      <div className="border-b border-gray-100 pb-4">
                        <div className="flex items-center justify-between gap-4">
                          <h3 className="font-semibold text-gray-900">
                            Interest-Bearing Debt
                          </h3>

                          <span className="text-sm font-medium">
                            {getCheckLabel(
                              result
                                .explanation
                                .checks
                                .debtRatio
                                .status
                            )}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-gray-600">
                          {
                            result
                              .explanation
                              .checks
                              .debtRatio
                              .message
                          }
                        </p>
                      </div>

                      <div className="border-b border-gray-100 pb-4">
                        <div className="flex items-center justify-between gap-4">
                          <h3 className="font-semibold text-gray-900">
                            Interest-Bearing Assets
                          </h3>

                          <span className="text-sm font-medium">
                            {getCheckLabel(
                              result
                                .explanation
                                .checks
                                .interestBearingAssets
                                .status
                            )}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-gray-600">
                          {
                            result
                              .explanation
                              .checks
                              .interestBearingAssets
                              .message
                          }
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-4">
                          <h3 className="font-semibold text-gray-900">
                            Impermissible Income
                          </h3>

                          <span className="text-sm font-medium">
                            {getCheckLabel(
                              result
                                .explanation
                                .checks
                                .impermissibleIncome
                                .status
                            )}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-gray-600">
                          {
                            result
                              .explanation
                              .checks
                              .impermissibleIncome
                              .message
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {result.businessActivity && (
                  <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Business Activity
                    </h2>

                    <div className="mt-4 space-y-3 text-gray-700">
                      <p>
                        <span className="font-semibold">
                          Main activity:
                        </span>{" "}
                        {
                          result
                            .businessActivity
                            .mainBusinessActivity
                        }
                      </p>

                      <p>
                        <span className="font-semibold">
                          Classification:
                        </span>{" "}
                        {
                          result
                            .businessActivity
                            .classification
                        }
                      </p>

                      {result
                        .businessActivity
                        .notes && (
                        <p>
                          <span className="font-semibold">
                            Notes:
                          </span>{" "}
                          {
                            result
                              .businessActivity
                              .notes
                          }
                        </p>
                      )}

                      {result
                        .businessActivity
                        .prohibitedActivities
                        ?.length > 0 && (
                        <div>
                          <p className="font-semibold">
                            Prohibited activities:
                          </p>

                          <ul className="mt-2 list-disc pl-5">
                            {result.businessActivity.prohibitedActivities.map(
                              (activity) => (
                                <li
                                  key={
                                    activity
                                  }
                                >
                                  {activity}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {result.ratios && (
                  <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Financial Ratios
                    </h2>

                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                      <div className="rounded-lg bg-gray-50 p-4">
                        <p className="text-sm text-gray-500">
                          Interest-Bearing Debt
                        </p>

                        <p className="mt-1 text-2xl font-bold text-gray-900">
                          {formatRatio(
                            result.ratios
                              .debtRatio
                          )}
                        </p>
                      </div>

                      <div className="rounded-lg bg-gray-50 p-4">
                        <p className="text-sm text-gray-500">
                          Interest-Bearing Assets
                        </p>

                        <p className="mt-1 text-2xl font-bold text-gray-900">
                          {formatRatio(
                            result.ratios
                              .interestBearingAssetsRatio
                          )}
                        </p>
                      </div>

                      <div className="rounded-lg bg-gray-50 p-4">
                        <p className="text-sm text-gray-500">
                          Impermissible Income
                        </p>

                        <p className="mt-1 text-2xl font-bold text-gray-900">
                          {formatRatio(
                            result.ratios
                              .impermissibleIncomeRatio
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {result.methodology && (
                  <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Methodology
                    </h2>

                    <div className="mt-4 space-y-2 text-gray-700">
                      <p>
                        <span className="font-semibold">
                          Method:
                        </span>{" "}
                        {
                          result.methodology
                            .name
                        }
                      </p>

                      <p>
                        <span className="font-semibold">
                          Source:
                        </span>{" "}
                        {
                          result.methodology
                            .source
                        }
                      </p>

                      <p className="break-all text-sm">
                        {
                          result.methodology
                            .sourceUrl
                        }
                      </p>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Data & Verification
                  </h2>

                  <div className="mt-4 space-y-2 text-gray-700">
                    <p>
                      <span className="font-semibold">
                        Verification status:
                      </span>{" "}
                      {
                        result.verification
                          ?.status ||
                        "Unavailable"
                      }
                    </p>

                    {result.verification
                      ?.verifiedBy && (
                      <p>
                        <span className="font-semibold">
                          Verified by:
                        </span>{" "}
                        {
                          result
                            .verification
                            .verifiedBy
                        }
                      </p>
                    )}
                    {result.verification
  ?.verificationNotes && (
  <p className="text-sm text-gray-600">
    <span className="font-semibold text-gray-700">
      Verification note:
    </span>{" "}
    {
      result.verification
        .verificationNotes
    }
  </p>
)}

                    {result
                      .financialDataSource
                      ?.dataDate && (
                      <p>
                        <span className="font-semibold">
                          Financial data date:
                        </span>{" "}
                        {
                          result
                            .financialDataSource
                            .dataDate
                        }
                      </p>
                    )}
                  </div>

                  {result.dataFreshness && (
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <p>
                        <span className="font-semibold">
                          Data freshness:
                        </span>{" "}
                        {
                          result.dataFreshness
                            .status
                        }
                      </p>

                      {result.dataFreshness
                        .ageInDays !==
                        null && (
                        <p>
                          <span className="font-semibold">
                            Data age:
                          </span>{" "}
                          {
                            result
                              .dataFreshness
                              .ageInDays
                          }{" "}
                          days
                        </p>
                      )}

                      <p className="mt-1 text-sm text-gray-600">
                        {
                          result.dataFreshness
                            .message
                        }
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6">
                  <h2 className="text-lg font-semibold text-yellow-900">
                    Important Disclaimer
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-yellow-800">
                    HalalWise provides educational
                    Shariah-screening information and does
                    not issue fatwas or provide personalized
                    financial advice. Financial information
                    can change, and different scholars or
                    Shariah methodologies may use different
                    screening criteria. Please consult a
                    qualified Islamic scholar or Shariah
                    advisor before making investment
                    decisions.
                  </p>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}