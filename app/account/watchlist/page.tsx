
"use client";

import { useEffect, useState } from "react";

type WatchlistStock = {
  id: string;
  symbol: string;
  companyName: string;
  createdAt: string;
};

type ShariahStatus =
  | "Compliant"
  | "Not Compliant"
  | "Needs Review"
  | "Insufficient Data"
  | "Loading";

type StockStatus = Record<string, ShariahStatus>;

export default function StockWatchlistPage() {
  const [stocks, setStocks] = useState<WatchlistStock[]>([]);
  const [statuses, setStatuses] = useState<StockStatus>({});
  const [loading, setLoading] = useState(true);
  const [refreshingSymbol, setRefreshingSymbol] =
    useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(
    null
  );
  const [error, setError] = useState("");

  useEffect(() => {
    loadWatchlist();
  }, []);

  async function loadWatchlist() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/stock-watchlist"
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to load watchlist."
        );
      }

      const watchlist: WatchlistStock[] =
        data.watchlist || [];

      setStocks(watchlist);

      const initialStatuses: StockStatus = {};

      watchlist.forEach((stock) => {
        initialStatuses[stock.symbol] = "Loading";
      });

      setStatuses(initialStatuses);

      await Promise.all(
        watchlist.map((stock) =>
          checkStockStatus(stock.symbol)
        )
      );
    } catch (err) {
      console.error(
        "Failed to load stock watchlist:",
        err
      );

      setError(
        "Unable to load your stock watchlist right now."
      );
    } finally {
      setLoading(false);
    }
  }

  async function checkStockStatus(symbol: string) {
    try {
      setStatuses((current) => ({
        ...current,
        [symbol]: "Loading",
      }));

      const response = await fetch(
        `/api/finance/company?ticker=${encodeURIComponent(
          symbol
        )}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to check stock."
        );
      }

      const status = getShariahStatus(data);

      setStatuses((current) => ({
        ...current,
        [symbol]: status,
      }));
    } catch (err) {
      console.error(
        `Failed to check Shariah status for ${symbol}:`,
        err
      );

      setStatuses((current) => ({
        ...current,
        [symbol]: "Needs Review",
      }));
    }
  }

  async function refreshStatus(symbol: string) {
    try {
      setRefreshingSymbol(symbol);
      setError("");

      await checkStockStatus(symbol);
    } finally {
      setRefreshingSymbol(null);
    }
  }

  async function removeStock(id: string) {
    try {
      setRemovingId(id);
      setError("");

      const response = await fetch(
        `/api/stock-watchlist?id=${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to remove stock."
        );
      }

      setStocks((current) =>
        current.filter((stock) => stock.id !== id)
      );
    } catch (err) {
      console.error(
        "Failed to remove stock:",
        err
      );

      setError(
        "Unable to remove this stock right now."
      );
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <a
            href="/account"
            className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
          >
            ← Back to Account
          </a>

          <div className="mt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-950 text-2xl">
                ⭐
              </div>

              <div>
                <h1 className="text-2xl font-bold sm:text-3xl">
                  Stock Watchlist
                </h1>

                <p className="mt-1 text-sm text-slate-400">
                  Stocks you saved to review later.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-slate-400">
              Loading your watchlist...
            </p>
          </div>
        ) : stocks.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-950 text-3xl">
              ⭐
            </div>

            <h2 className="mt-5 text-xl font-semibold">
              Your watchlist is empty
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
              Save stocks from HalalWise Finance to
              keep them here for later review.
            </p>

            <a
              href="/finance"
              className="mt-6 inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Explore Finance
            </a>
          </div>
        ) : (
          /* Stock list */
          <div className="space-y-4">
            {/* List heading */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Saved Stocks
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {stocks.length}{" "}
                  {stocks.length === 1
                    ? "stock"
                    : "stocks"}{" "}
                  saved
                </p>
              </div>

              <button
                type="button"
                onClick={loadWatchlist}
                disabled={loading}
                className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-emerald-700 hover:bg-emerald-950 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                🔄 Refresh
              </button>
            </div>

            {/* Stock cards */}
            <div className="grid gap-4">
              {stocks.map((stock) => {
                const status =
                  statuses[stock.symbol] ||
                  "Loading";

                const isRefreshing =
                  refreshingSymbol === stock.symbol;

                return (
                  <div
                    key={stock.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition duration-200 hover:border-emerald-700 hover:bg-slate-800/80 sm:p-6"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      {/* Stock information */}
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-950 text-xl">
                          📈
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-lg font-semibold text-white">
                              {stock.companyName}
                            </h3>

                            <span className="rounded-full border border-emerald-800 bg-emerald-950 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                              Saved
                            </span>
                          </div>

                          <p className="mt-1 text-sm font-semibold tracking-wide text-emerald-400">
                            {stock.symbol}
                          </p>

                          {/* Shariah status */}
                          <div className="mt-3">
                            <ShariahStatusBadge
                              status={status}
                            />
                          </div>

                          <p className="mt-2 text-xs text-slate-500">
                            Added{" "}
                            {new Date(
                              stock.createdAt
                            ).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
                        <a
                          href={`/finance?symbol=${encodeURIComponent(
                            stock.symbol
                          )}`}
                          className="inline-flex items-center justify-center rounded-xl border border-emerald-700 px-4 py-2.5 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-950"
                        >
                          🔍 Check Stock
                        </a>

                        <button
                          type="button"
                          onClick={() =>
                            refreshStatus(
                              stock.symbol
                            )
                          }
                          disabled={isRefreshing}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-emerald-700 hover:bg-emerald-950 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isRefreshing
                            ? "Checking..."
                            : "🔄 Refresh Status"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            removeStock(stock.id)
                          }
                          disabled={
                            removingId === stock.id
                          }
                          className="inline-flex items-center justify-center rounded-xl border border-red-900 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {removingId === stock.id
                            ? "Removing..."
                            : "🗑 Remove"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/* ----------------------------------------
   Get Shariah status from Finance response
----------------------------------------- */

function getShariahStatus(
  data: any
): ShariahStatus {
  const rawStatus =
    data?.screeningResult;

  if (!rawStatus) {
    return "Needs Review";
  }

  const status = String(rawStatus)
    .trim()
    .toLowerCase();

  switch (status) {
    case "compliant":
      return "Compliant";

    case "not_compliant":
      return "Not Compliant";

    case "needs_review":
      return "Needs Review";

    case "insufficient_data":
      return "Insufficient Data";

    default:
      return "Needs Review";
  }
}

/* ----------------------------------------
   Shariah status badge
----------------------------------------- */

function ShariahStatusBadge({
  status,
}: {
  status: ShariahStatus;
}) {
  if (status === "Loading") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-slate-500" />
        Checking Shariah status...
      </span>
    );
  }

  if (status === "Compliant") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-800 bg-emerald-950 px-3 py-1.5 text-xs font-semibold text-emerald-400">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        Shariah Compliant
      </span>
    );
  }

  if (status === "Not Compliant") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-red-800 bg-red-950 px-3 py-1.5 text-xs font-semibold text-red-400">
        <span className="h-2 w-2 rounded-full bg-red-400" />
        Not Shariah Compliant
      </span>
    );
  }

  if (status === "Insufficient Data") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-yellow-800 bg-yellow-950 px-3 py-1.5 text-xs font-semibold text-yellow-400">
        <span className="h-2 w-2 rounded-full bg-yellow-400" />
        Insufficient Data
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-amber-800 bg-amber-950 px-3 py-1.5 text-xs font-semibold text-amber-400">
      <span className="h-2 w-2 rounded-full bg-amber-400" />
      Needs Review
    </span>
  );
}
