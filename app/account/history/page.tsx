"use client";

import { useEffect, useState } from "react";

type HistoryItem = {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
};

export default function QuestionHistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await fetch("/api/question-history");

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (data.success) {
          setHistory(data.history || []);
        }
      } catch (error) {
        console.error(
          "Failed to load question history:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  const deleteHistory = async (id: string) => {
    try {
      setDeleting(id);

      const response = await fetch(
        `/api/question-history?id=${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to delete history."
        );
      }

      setHistory((current) =>
        current.filter((item) => item.id !== id)
      );
    } catch (error) {
      console.error(
        "Failed to delete question history:",
        error
      );

      alert("Failed to delete this question.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between border-b border-slate-800 px-8 py-5">
        <a
          href="/"
          className="text-2xl font-bold"
        >
          HalalWise 🕌
        </a>

        <div className="flex gap-6 text-sm text-slate-300">
          <a
            href="/"
            className="hover:text-white"
          >
            Home
          </a>

          <a
            href="/assistant"
            className="hover:text-white"
          >
            Islamic Assistant
          </a>

          <a
            href="/account"
            className="hover:text-white"
          >
            My Account
          </a>
        </div>
      </nav>

      {/* Main */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="text-center">
          <div className="mb-4 text-5xl">
            🕘
          </div>

          <h1 className="text-4xl font-bold">
            Question History
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            Questions you have asked the HalalWise
            Islamic Assistant.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
            Loading your question history...
          </div>
        )}

        {/* Empty */}
        {!loading && history.length === 0 && (
          <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <div className="text-4xl">
              💬
            </div>

            <h2 className="mt-4 text-xl font-semibold">
              No questions yet
            </h2>

            <p className="mt-2 text-slate-400">
              Questions you ask the Islamic Assistant
              will appear here.
            </p>

            <a
              href="/assistant"
              className="mt-6 inline-block rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Ask a Question
            </a>
          </div>
        )}

        {/* History */}
        {!loading && history.length > 0 && (
          <div className="mt-10 space-y-6">
            {history.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
              >
                {/* Date */}
                <p className="text-xs text-slate-500">
                  {new Date(
                    item.createdAt
                  ).toLocaleString()}
                </p>

                {/* Question */}
                <div className="mt-4">
                  <h2 className="text-sm font-semibold text-emerald-400">
                    Your Question
                  </h2>

                  <p className="mt-2 text-lg font-medium text-white">
                    {item.question}
                  </p>
                </div>

                {/* Answer */}
                <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-5">
                  <h3 className="text-sm font-semibold text-slate-300">
                    Answer
                  </h3>

                  <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-400">
                    {item.answer}
                  </p>
                </div>

                {/* Actions */}
                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href="/assistant"
                    className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-emerald-500 hover:text-white"
                  >
                    Ask another question
                  </a>

                  <button
                    type="button"
                    onClick={() =>
                      deleteHistory(item.id)
                    }
                    disabled={deleting === item.id}
                    className="rounded-lg border border-red-900/60 px-4 py-2 text-sm text-red-400 transition hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deleting === item.id
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}