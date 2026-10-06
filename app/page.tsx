"use client";

import { FormEvent, useState } from "react";

type SearchResult = {
  type: "quran" | "hadith" | "lesson" | "finance" | "stock";
  title: string;
  description: string;
  reference?: string;
  category?: string;
  verified?: boolean;
  verificationStatus?: string;
  sourceName?: string;
  sourceUrl?: string;
  slug?: string;
  url?: string;
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const searchQuery = query.trim();

    if (!searchQuery) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&type=all`
      );

      const data = await response.json();

      if (data.success) {
        setResults(data.results || []);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function getResultUrl(result: SearchResult) {
    if (result.url) {
      return result.url;
    }

    if (result.sourceUrl) {
      return result.sourceUrl;
    }

    return "#";
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      
      {/* Global Search */}
      <section className="border-b border-slate-800 bg-slate-900/50 px-6 py-8">

        <div className="mx-auto max-w-3xl">

          <div className="mb-3 text-sm font-medium text-emerald-400">
            GLOBAL SEARCH
          </div>

          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-3 sm:flex-row"
          >

            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Qur'an, Hadith, lessons..."
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 text-white outline-none placeholder:text-slate-500 focus:border-emerald-500"
            />

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Searching..." : "Search"}
            </button>

          </form>

          {/* Search Results */}
          {searched && (
            <div className="mt-6">

              {loading ? (
                <p className="text-slate-400">
                  Searching HalalWise...
                </p>
              ) : results.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
                  <p className="text-slate-300">
                    No results found for "{query}".
                  </p>
                </div>
              ) : (
                <div className="space-y-3">

                  <p className="mb-3 text-sm text-slate-400">
                    {results.length} result
                    {results.length !== 1 ? "s" : ""} found
                  </p>

                  {results.map((result, index) => {
                    const resultUrl = getResultUrl(result);

                    return (
                      <a
                        key={`${result.type}-${result.reference || result.title}-${index}`}
                        href={resultUrl}
                        target={
                          result.sourceUrl && !result.url
                            ? "_blank"
                            : undefined
                        }
                        rel={
                          result.sourceUrl && !result.url
                            ? "noopener noreferrer"
                            : undefined
                        }
                        className="block rounded-xl border border-slate-800 bg-slate-950 p-5 transition hover:border-emerald-500"
                      >

                        <div className="mb-2 flex flex-wrap items-center gap-2">

                          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
  {result.type === "quran"
    ? "Qur'an"
    : result.type === "hadith"
    ? "Hadith"
    : result.type === "lesson"
    ? "Learn"
    : result.type === "finance"
    ? "Finance"
    : result.type === "stock"
    ? "Stock"
    : result.type}
</span>

                          {result.verified && (
                            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
                              ✓ Verified
                            </span>
                          )}

                        </div>

                        <h3 className="text-lg font-semibold">
                          {result.title}
                        </h3>

                        <p className="mt-2 text-sm text-slate-400">
                          {result.description}
                        </p>

                        {result.reference && (
                          <p className="mt-3 text-xs text-slate-500">
                            {result.reference}
                          </p>
                        )}

                        {result.category && (
                          <p className="mt-1 text-xs text-slate-500">
                            Category: {result.category}
                          </p>
                        )}

                      </a>
                    );
                  })}

                </div>
              )}

            </div>
          )}

        </div>

      </section>

      {/* Hero Section */}
      <section className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">

        <p className="mb-4 text-sm font-medium text-emerald-400">
          YOUR ISLAMIC & HALAL FINANCE COMPANION
        </p>

        <h2 className="max-w-4xl text-5xl font-bold leading-tight md:text-7xl">
          Understand Islam.
          <br />
          Invest with confidence.
        </h2>

        <p className="mt-6 max-w-2xl text-lg text-slate-400">
          Explore Islamic knowledge and research investments
          using transparent, source-based Shariah screening.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">

          <a
            href="/assistant"
            className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950"
          >
            Ask Islamic Assistant
          </a>

          <a
            href="/finance"
            className="rounded-xl border border-slate-700 px-6 py-3 font-semibold"
          >
            Check a Stock
          </a>

        </div>

      </section>

      {/* Features */}
      <section className="grid gap-6 px-8 pb-20 md:grid-cols-3">

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="text-3xl">🤖</div>

          <h3 className="mt-4 text-xl font-semibold">
            AI Islamic Assistant
          </h3>

          <p className="mt-2 text-slate-400">
            Ask Islamic questions and explore source-grounded
            explanations.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="text-3xl">💰</div>

          <h3 className="mt-4 text-xl font-semibold">
            Halal Finance
          </h3>

          <p className="mt-2 text-slate-400">
            Research companies using transparent Shariah
            screening criteria.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="text-3xl">📚</div>

          <h3 className="mt-4 text-xl font-semibold">
            Learn
          </h3>

          <p className="mt-2 text-slate-400">
            Learn Islamic finance concepts in simple language.
          </p>
        </div>

      </section>

    </main>
  );
}