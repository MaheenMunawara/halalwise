
"use client";

import { useState } from "react";

type QuranBookmark = {
  _id: string;
  verseId: string;
  reference: string;
  text: string;
  surah: string;
  source: string;
  sourceUrl: string;
  createdAt: string;
};

export default function SavedQuranList({
  quran,
}: {
  quran: QuranBookmark[];
}) {
  const [items, setItems] = useState(quran);
  const [removing, setRemoving] = useState<string | null>(null);

  async function removeBookmark(verseId: string) {
    setRemoving(verseId);

    try {
      const response = await fetch(
        `/api/quran-bookmarks?verseId=${encodeURIComponent(
          verseId
        )}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to remove bookmark");
      }

      setItems((current) =>
        current.filter(
          (item) => item.verseId !== verseId
        )
      );
    } catch (error) {
      console.error(
        "Failed to remove Qur'an bookmark:",
        error
      );
    } finally {
      setRemoving(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
        <p className="text-slate-300">
          You have not saved any Qur'an verses yet.
        </p>

        <a
          href="/assistant"
          className="mt-4 inline-block text-sm text-emerald-400 transition hover:text-emerald-300"
        >
          Ask the Islamic Assistant →
        </a>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-5">
      {items.map((item) => (
        <article
          key={item.verseId}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-emerald-400">
                {item.reference}
              </h2>

              {item.surah && (
                <p className="mt-1 text-sm text-slate-500">
                  {item.surah}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                removeBookmark(item.verseId)
              }
              disabled={removing === item.verseId}
              className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-400 transition hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {removing === item.verseId
                ? "Removing..."
                : "Remove"}
            </button>
          </div>

          <p className="mt-5 leading-7 text-slate-200">
            {item.text}
          </p>

          {item.source && (
            <p className="mt-4 text-sm text-slate-500">
              Source: {item.source}
            </p>
          )}

          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-slate-400 transition hover:text-emerald-400"
            >
              View source ↗
            </a>
          )}
        </article>
      ))}
    </div>
  );
}
