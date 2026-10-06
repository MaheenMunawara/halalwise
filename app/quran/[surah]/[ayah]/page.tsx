"use client";

import { useEffect, useState } from "react";

type QuranData = {
  reference: string;
  surahName: string;
  surahNumber: number;
  ayahNumber: number;
  translation: {
    name: string;
    translator: string;
    text: string;
  };
  verification: {
    verified: boolean;
    verifiedBy?: string;
    verifiedAt?: string;
  };
  attribution?: {
    required: boolean;
    text?: string;
  };
  license?: {
    name?: string;
    status?: string;
  };
};

export default function QuranVersePage({
  params,
}: {
  params: Promise<{
    surah: string;
    ayah: string;
  }>;
}) {
  const [data, setData] = useState<QuranData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadVerse() {
      try {
        const { surah, ayah } = await params;

        const response = await fetch(
          `/api/get-clearquran-verse?surah=${surah}&ayah=${ayah}`
        );

        const result = await response.json();

        if (!response.ok || !result.success || !result.verse) {
          throw new Error(
            result.message ||
              "Failed to load Qur'an verse."
          );
        }

        setData(result.verse);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load Qur'an verse."
        );
      } finally {
        setLoading(false);
      }
    }

    loadVerse();
  }, [params]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
        <div className="mx-auto max-w-3xl">
          <p className="text-slate-400">
            Loading Qur'an verse...
          </p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
        <div className="mx-auto max-w-3xl">
          <a
            href="/"
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            ← Back to HalalWise
          </a>

          <div className="mt-8 rounded-2xl border border-red-900/50 bg-slate-900 p-6">
            <h1 className="text-xl font-semibold">
              Qur'an verse unavailable
            </h1>

            <p className="mt-2 text-slate-400">
              {error ||
                "The requested verse could not be found."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-slate-800 px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <a
            href="/"
            className="text-2xl font-bold hover:text-emerald-400"
          >
            HalalWise 🕌
          </a>

          <a
            href="/"
            className="text-sm text-slate-400 hover:text-emerald-400"
          >
            ← Back to Search
          </a>
        </div>
      </nav>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <p className="text-sm font-medium uppercase tracking-wider text-emerald-400">
              Qur'an
            </p>

            <h1 className="mt-2 text-3xl font-bold md:text-4xl">
              {data.reference}
            </h1>

            <p className="mt-2 text-slate-400">
              {data.surahName} • Ayah {data.ayahNumber}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {data.verification?.verified && (
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                  ✓ Verified
                </span>
              )}

              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                {data.translation.name}
              </span>
            </div>

            <p className="text-lg leading-9 text-slate-200 md:text-xl">
              {data.translation.text}
            </p>

            <div className="mt-8 border-t border-slate-800 pt-6">
              <p className="text-sm font-medium text-slate-400">
                Translation
              </p>

              <p className="mt-1 font-medium">
                {data.translation.name}
              </p>

              <p className="mt-1 text-sm text-slate-400">
                {data.translation.translator}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-sm font-medium text-slate-300">
              Verification
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              This verse is retrieved from HalalWise's
              verified Clear Quran translation data.
            </p>

            {data.verification?.verifiedBy && (
              <p className="mt-2 text-xs text-slate-500">
                Verified by:{" "}
                {data.verification.verifiedBy}
              </p>
            )}
          </div>

          {data.attribution?.required && (
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <p className="text-sm font-medium text-slate-300">
                Attribution
              </p>

              <p className="mt-2 text-sm text-slate-400">
                {data.attribution.text}
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}