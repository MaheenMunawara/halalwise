
"use client";

import { useState } from "react";

type SavedHadith = {
  _id: string;
  hadithId: string;
  title: string;
  text: string;
  source: string;
  sourceUrl: string;
  createdAt: string;
};

export default function SavedHadithList({
  hadith,
}: {
  hadith: SavedHadith[];
}) {
  const [savedHadith, setSavedHadith] =
    useState<SavedHadith[]>(hadith);

  const [removingId, setRemovingId] =
    useState<string | null>(null);

  const removeHadith = async (hadithId: string) => {
    try {
      setRemovingId(hadithId);

      const response = await fetch(
        "/api/hadith-bookmarks",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            hadithId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to remove saved Hadith."
        );
      }

      setSavedHadith((current) =>
        current.filter(
          (hadith) => hadith.hadithId !== hadithId
        )
      );
    } catch (error) {
      console.error(
        "Failed to remove saved Hadith:",
        error
      );

      alert(
        "Could not remove the saved Hadith. Please try again."
      );
    } finally {
      setRemovingId(null);
    }
  };

  if (savedHadith.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
        <div className="text-4xl">📖</div>

        <h2 className="mt-4 text-xl font-semibold">
          No saved Hadith yet
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          Save a Hadith from the Islamic Assistant
          and it will appear here.
        </p>

        <a
          href="/assistant"
          className="mt-6 inline-block rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          Explore Hadith
        </a>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-5">
      {savedHadith.map((hadith) => (
        <article
          key={hadith._id}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
        >
          <p className="text-sm font-semibold text-emerald-400">
            {hadith.source || "Hadith"}
          </p>

          <h2 className="mt-2 text-xl font-semibold text-slate-100">
            {hadith.title}
          </h2>

          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Hadith
            </p>

            <p className="mt-2 text-sm leading-7 text-slate-300">
              {hadith.text}
            </p>
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Reference
            </p>

            <p className="mt-2 text-sm font-medium text-slate-200">
              {hadith.title}
            </p>
          </div>

          {hadith.sourceUrl && (
            <div className="mt-5">
              <a
                href={hadith.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-2 text-sm font-medium text-emerald-400 transition hover:border-emerald-500 hover:bg-emerald-950"
              >
                View original source
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          )}

          {hadith.createdAt && (
            <p className="mt-5 text-xs text-slate-500">
              Saved on{" "}
              {new Date(
                hadith.createdAt
              ).toLocaleDateString()}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="/assistant"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-500 hover:bg-slate-800"
            >
              Ask Assistant
            </a>

            <button
              type="button"
              onClick={() =>
                removeHadith(hadith.hadithId)
              }
              disabled={
                removingId === hadith.hadithId
              }
              className="rounded-lg border border-red-900 px-4 py-2 text-sm font-medium text-red-400 transition hover:border-red-600 hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {removingId === hadith.hadithId
                ? "Removing..."
                : "🗑 Remove"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
