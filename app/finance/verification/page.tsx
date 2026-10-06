
"use client";

import { useEffect, useState } from "react";

type Company = {
  companyName: string;
  ticker: string;
  exchange?: string | null;
  sector?: string | null;

  businessActivity?: {
    mainBusinessActivity?: string | null;
    classification?: string | null;
    prohibitedActivities?: string[];
    notes?: string | null;
  };

  financialData?: {
    marketCapitalization?: number | null;
    interestBearingDebt?: number | null;
    interestBearingAssets?: number | null;
    totalIncome?: number | null;
    impermissibleIncome?: number | null;
  };

  ratios?: {
    debtRatio?: number | null;
    interestBearingAssetsRatio?: number | null;
    impermissibleIncomeRatio?: number | null;
  };

  financialDataSource?: {
    name?: string | null;
    dataDate?: string | null;
  };

  verification?: {
    status?: string;
    verifiedAt?: string | null;
    verifiedBy?: string | null;
    verificationNotes?: string | null;
  };
};

function formatPercent(
  value: number | null | undefined
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "Unavailable";
  }

  return `${value}%`;
}

function getStatusStyles(status?: string) {
  const normalized =
    status?.toLowerCase() || "unverified";

  if (normalized === "verified") {
    return {
      label: "Verified",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700",
      dot: "bg-emerald-500",
    };
  }

  if (normalized === "pending") {
    return {
      label: "Pending",
      className:
        "border-amber-200 bg-amber-50 text-amber-700",
      dot: "bg-amber-500",
    };
  }

  return {
    label: "Unverified",
    className:
      "border-gray-200 bg-gray-50 text-gray-600",
    dot: "bg-gray-400",
  };
}

function StatusBadge({
  status,
}: {
  status?: string;
}) {
  const styles = getStatusStyles(status);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${styles.className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${styles.dot}`}
      />
      {styles.label}
    </span>
  );
}

export default function FinanceVerificationPage() {
  const [companies, setCompanies] = useState<Company[]>(
    []
  );

  const [selectedTicker, setSelectedTicker] =
    useState("");

  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [message, setMessage] = useState("");

  async function loadCompanies() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/finance/companies"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to load finance records."
        );
      }

      setCompanies(
        Array.isArray(data?.companies)
          ? data.companies
          : []
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load finance records."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  const selectedCompany =
    companies.find(
      (company) =>
        company.ticker === selectedTicker
    ) ?? null;

  function selectCompany(company: Company) {
    setSelectedTicker(company.ticker);

    setNotes(
      company.verification
        ?.verificationNotes || ""
    );

    setMessage("");
  }

  async function verifyCompany() {
    if (!selectedCompany) {
      setMessage(
        "Please select a company first."
      );
      return;
    }

    if (!notes.trim()) {
      setMessage(
        "Please enter verification notes."
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch(
        "/api/finance/verify",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            ticker:
              selectedCompany.ticker,
            verificationNotes:
              notes.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Verification failed."
        );
      }

      setMessage(
        "Company verification completed successfully."
      );

      await loadCompanies();
    } catch (error) {
  setMessage(
        error instanceof Error
          ? error.message
          : "Verification failed."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-gray-500">
              Loading finance records...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-xl font-bold text-red-900">
              Finance Verification
            </h1>

            <p className="mt-2 text-sm text-red-700">
              {error}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Finance Review
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Finance Verification
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
                Review business activity, financial
                screening values, and source information
                before marking a company as verified.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Finance records
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {companies.length}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">

          {/* Company list */}
          <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="border-b border-gray-100 px-2 pb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Companies
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Select a company to review.
              </p>
            </div>

            <div className="mt-4 space-y-2">
              {companies.length === 0 ? (
                <div className="rounded-xl bg-gray-50 p-5 text-center">
                  <p className="text-sm text-gray-500">
                    No finance records found.
                  </p>
                </div>
              ) : (
                companies.map((company) => {
                  const isSelected =
                    selectedTicker ===
                    company.ticker;

                  return (
                    <button
                      key={company.ticker}
                      type="button"
                      onClick={() =>
                        selectCompany(company)
                      }
                      className={`w-full rounded-xl border p-4 text-left transition-all duration-200 ${
                        isSelected
                          ? "border-gray-900 bg-gray-900 shadow-md"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className={`truncate font-semibold ${
                              isSelected
                                ? "text-white"
                                : "text-gray-900"
                            }`}
                          >
                            {company.companyName}
                          </p>

                          <p
                            className={`mt-1 text-sm ${
                              isSelected
                                ? "text-gray-300"
                                : "text-gray-500"
                            }`}
                          >
                            {company.ticker}
                          </p>
                        </div>

                        <div
                          className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                            isSelected
                              ? "bg-white/15 text-white"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {company.verification
                            ?.status ||
                            "unverified"}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Details */}
          <section className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm">

            {!selectedCompany ? (
              <div className="flex min-h-[500px] items-center justify-center p-8">
                <div className="max-w-sm text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                    <span className="text-xl text-gray-500">
                      ✓
                    </span>
                  </div>

                  <h2 className="mt-5 text-lg font-bold text-gray-900">
                    Select a company
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    Choose a company from the list to
                    review its Shariah-screening
                    information.
                  </p>
                </div>
              </div>
            ) : (
              <div>

                {/* Company header */}
                <div className="border-b border-gray-100 p-6 sm:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                          {selectedCompany.companyName}
                        </h2>

                        <StatusBadge
                          status={
                            selectedCompany
                              .verification
                              ?.status
                          }
                        />
                      </div>

                      <p className="mt-2 text-sm font-medium text-gray-500">
                        {selectedCompany.ticker}

                        {selectedCompany.exchange
                          ? ` • ${selectedCompany.exchange}`
                          : ""}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-8">

                  {/* Screening overview */}
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-gray-900">
                        Screening overview
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        Key information used during
                        the finance review.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

                      {/* Classification */}
                      <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Business classification
                        </p>

                        <p className="mt-2 text-lg font-bold capitalize text-gray-900">
                          {selectedCompany
                            .businessActivity
                            ?.classification ||
                            "Unavailable"}
                        </p>
                      </div>

                      {/* Verification */}
                      <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Current verification
                        </p>

                        <div className="mt-2">
                          <StatusBadge
                            status={
                              selectedCompany
                                .verification
                                ?.status
                            }
                          />
                        </div>
                      </div>

                      {/* Debt */}
                      <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Debt ratio
                        </p>

                        <p className="mt-2 text-lg font-bold text-gray-900">
                          {formatPercent(
                            selectedCompany
                              .ratios
                              ?.debtRatio
                          )}
                        </p>
                      </div>

                      {/* Interest-bearing assets */}
                      <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Interest-bearing assets
                        </p>

                        <p className="mt-2 text-lg font-bold text-gray-900">
                          {formatPercent(
                            selectedCompany
                              .ratios
                              ?.interestBearingAssetsRatio
                          )}
                        </p>
                      </div>

                      {/* Impermissible income */}
                      <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Impermissible income
                        </p>

                        <p className="mt-2 text-lg font-bold text-gray-900">
                          {formatPercent(
                            selectedCompany
                              .ratios
                              ?.impermissibleIncomeRatio
                          )}
                        </p>
                      </div>

                      {/* Data date */}
                      <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Financial data date
                        </p>

                        <p className="mt-2 text-lg font-bold text-gray-900">
                          {selectedCompany
                            .financialDataSource
                            ?.dataDate ||
                            "Unavailable"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Business activity */}
                  <div className="mt-8 rounded-2xl border border-gray-200 bg-white">
                    <div className="border-b border-gray-100 px-5 py-4">
                      <h3 className="font-bold text-gray-900">
                        Business activity
                      </h3>
                    </div>

                    <div className="p-5">
                      <p className="text-sm leading-7 text-gray-700">
                        {selectedCompany
                          .businessActivity
                          ?.mainBusinessActivity ||
                          "Unavailable"}
                      </p>

                      {selectedCompany
                        .businessActivity
                        ?.notes && (
                        <div className="mt-4 rounded-xl bg-gray-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            Additional notes
                          </p>

                          <p className="mt-2 text-sm leading-6 text-gray-600">
                            {
                              selectedCompany
                                .businessActivity
                                .notes
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Verification notes */}
                  <div className="mt-8">
                    <div className="mb-3">
                      <h3 className="font-bold text-gray-900">
                        Verification notes
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-gray-500">
                        Record what you reviewed and
                        why the finance record is being
                        verified.
                      </p>
                    </div>

                    <textarea
                      id="verificationNotes"
                      value={notes}
                      onChange={(event) =>
                        setNotes(
                          event.target.value
                        )
                      }
                      rows={6}
                      placeholder="Example: Reviewed the available financial data, business activity classification, screening ratios, and source date."
                      className="w-full resize-y rounded-xl border border-gray-300 bg-white p-4 text-sm leading-6 text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                    />
                  </div>

                  {/* Message */}
                  {message && (
                    <div
                      className={`mt-5 rounded-xl border p-4 ${
                        message.includes(
                          "completed successfully"
                        )
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                            message.includes(
                              "completed successfully"
                            )
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {message.includes(
                            "completed successfully"
                          )
                            ? "✓"
                            : "!"}
                        </div>

                        <p
                          className={`text-sm font-medium leading-6 ${
                            message.includes(
                              "completed successfully"
                            )
                              ? "text-emerald-800"
                              : "text-gray-700"
                          }`}
                        >
                          {message}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
<div className="mt-8 border-t border-gray-100 pt-6">
  <div className="space-y-4">

    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Verification action
      </p>

      <button
        type="button"
        onClick={verifyCompany}
        disabled={saving}
        className="flex min-h-14 w-full items-center justify-center rounded-xl bg-gray-900 px-6 py-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-gray-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? (
          <>
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Verifying...
          </>
        ) : (
          <>
            <span className="mr-2 text-base">
              ✓
            </span>
            Mark as Verified
          </>
        )}
      </button>
    </div>

    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Review controls
      </p>

      <button
        type="button"
        onClick={() => {
          setSelectedTicker("");
          setNotes("");
          setMessage("");
        }}
        className="flex min-h-14 w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-4 text-sm font-bold text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50"
      >
        Clear Selection
      </button>
    </div>

  </div>
</div>
              </div>
            )}

          </section>
        </div>
      </div>
    </main>
  );
}
