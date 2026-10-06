
"use client";

import { useEffect, useState } from "react";

export default function AssistantPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<any[]>([]);
  const [safetyNotice, setSafetyNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const [retrieval, setRetrieval] = useState<any>(null);
  const [selectedSource, setSelectedSource] = useState<any>(null);

  const [savedHadith, setSavedHadith] = useState<string[]>([]);
  const [savingHadith, setSavingHadith] =
    useState<string | null>(null);

  const [savedQuran, setSavedQuran] = useState<string[]>([]);
  const [savingQuran, setSavingQuran] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadSavedHadith() {
      try {
        const response = await fetch(
          "/api/hadith-bookmarks"
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (data.success) {
          const hadithIds = (data.bookmarks || [])
            .map(
              (bookmark: {
                hadithId?: string;
              }) => bookmark.hadithId
            )
            .filter(
              (
                hadithId: string | undefined
              ): hadithId is string =>
                Boolean(hadithId)
            );

          setSavedHadith(hadithIds);
        }
      } catch (error) {
        console.error(
          "Failed to load saved Hadith:",
          error
        );
      }
    }

    loadSavedHadith();
  }, []);

  useEffect(() => {
    async function loadSavedQuran() {
      try {
        const response = await fetch(
          "/api/quran-bookmarks"
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (data.success) {
          const verseIds = (data.bookmarks || [])
            .map(
              (bookmark: {
                verseId?: string;
              }) => bookmark.verseId
            )
            .filter(
              (
                verseId: string | undefined
              ): verseId is string =>
                Boolean(verseId)
            );

          setSavedQuran(verseIds);
        }
      } catch (error) {
        console.error(
          "Failed to load saved Qur'an verses:",
          error
        );
      }
    }

    loadSavedQuran();
  }, []);

  const getCategoryMatch = (
    categoryMatch?: string
  ) => {
    switch (categoryMatch) {
      case "match":
        return {
          text: "✓ Matched",
          className: "text-emerald-400",
        };

      case "supporting-primary":
        return {
          text: "✓ Supporting primary source",
          className: "text-emerald-400",
        };

      case "supporting-scholarly":
        return {
          text: "✓ Supporting scholarly source",
          className: "text-blue-400",
        };

      case "neutral":
        return {
          text: "• General source",
          className: "text-slate-300",
        };

      case "different":
        return {
          text: "⚠ Different category",
          className: "text-amber-400",
        };

      default:
        return {
          text: "• Not specified",
          className: "text-slate-400",
        };
    }
  };

  const formatCategory = (
    category?: string
  ) => {
    if (!category) {
      return "General";
    }

    const normalized = String(category)
      .toLowerCase()
      .replace(/_/g, "-")
      .replace(/\s+/g, "-");

    switch (normalized) {
      case "quran":
      case "qur'an":
        return "Qur'an";

      case "hadith":
        return "Hadith";

      case "tafsir":
        return "Tafsir";

      case "fiqh":
        return "Fiqh";

      case "islamic-finance":
      case "finance":
        return "Islamic Finance";

      case "scholarly":
        return "Scholarly";

      default:
        return "General";
    }
  };

  const toggleSaveHadith = async (
    source: any
  ) => {
    const hadith = source?.hadith;

    if (!hadith) {
      return;
    }

    const hadithId =
      source.reference || "";

    if (!hadithId) {
      alert(
        "This Hadith does not have a reference to save."
      );
      return;
    }

    const isSaved =
      savedHadith.includes(hadithId);

    try {
      setSavingHadith(hadithId);

      if (isSaved) {
        const response = await fetch(
          "/api/hadith-bookmarks",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              hadithId,
            }),
          }
        );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.error ||
              "Failed to remove saved Hadith."
          );
        }

        setSavedHadith((current) =>
          current.filter(
            (id) => id !== hadithId
          )
        );
      } else {
        const response = await fetch(
          "/api/hadith-bookmarks",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              hadithId,
              title:
                hadith.reference ||
                "Hadith",
              text:
                hadith.translation?.text ||
                hadith.arabicText ||
                "",
              source:
                source.collection ||
                source.source ||
                "Hadith",
            }),
          }
        );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.error ||
              "Failed to save Hadith."
          );
        }

        setSavedHadith((current) => [
          ...current,
          hadithId,
        ]);
      }
    } catch (error) {
      console.error(
        "Hadith bookmark action failed:",
        error
      );

      alert(
        "Please log in to save Hadith, or try again."
      );
    } finally {
      setSavingHadith(null);
    }
  };

  

const toggleSaveQuran = async (source: any) => {
  const verseId =
    source?.surahNumber && source?.ayahNumber
      ? `${source.surahNumber}:${source.ayahNumber}`
      : "";

  if (!verseId) {
    return;
  }

  const isSaved = savedQuran.includes(verseId);

  setSavingQuran(verseId);

  try {
    if (isSaved) {
      const response = await fetch(
        `/api/quran-bookmarks?verseId=${encodeURIComponent(verseId)}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to remove saved Qur'an verse");
      }

      setSavedQuran((prev) =>
        prev.filter((id) => id !== verseId)
      );

      return;
    }

    const response = await fetch(
      `/api/get-clearquran-verse?surah=${source.surahNumber}&ayah=${source.ayahNumber}`
    );

    const quranData = await response.json();

    if (!response.ok || !quranData?.success) {
      throw new Error(
        quranData?.message ||
          "Verified Qur'an translation could not be retrieved"
      );
    }

    const verse = quranData?.verse;
    const text = verse?.translation?.text;

    if (!text) {
      throw new Error("Verified Qur'an verse text is missing");
    }

    const saveResponse = await fetch("/api/quran-bookmarks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        verseId,
        reference: verse.reference,
        text,
        surah: verse.surahName,
        source: "Clear Quran",
        sourceUrl: "https://www.clearquran.com/",
      }),
    });

    const saveData = await saveResponse.json();

    if (!saveResponse.ok) {
      throw new Error(
        saveData?.message ||
          "Failed to save Qur'an verse"
      );
    }

    setSavedQuran((prev) =>
      prev.includes(verseId)
        ? prev
        : [...prev, verseId]
    );
  } catch (error) {
    console.error("Save Qur'an error:", error);
  } finally {
    setSavingQuran("");
  }
};




  const askQuestion = async () => {
    if (!question.trim()) {
      return;
    }

    setLoading(true);
    setAnswer("");
    setSources([]);
    setSafetyNotice("");
    setRetrieval(null);
    setSelectedSource(null);

    try {
      const response = await fetch(
        "/api/assistant",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            question: question,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setAnswer(
          data.error ||
            "Something went wrong."
        );
        setSources([]);
        setSafetyNotice(
          data.safetyNotice || ""
        );
        setRetrieval(
          data.retrieval || null
        );
        setSelectedSource(
          data.selectedSource || null
        );
        return;
      }

      setAnswer(data.answer);
      setSources(data.sources || []);
      setSafetyNotice(
        data.safetyNotice || ""
      );
      setRetrieval(
        data.retrieval || null
      );
      setSelectedSource(
        data.selectedSource || null
      );
      // Save this question and answer to Question History
try {
  await fetch("/api/question-history", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question: question.trim(),
      answer: data.answer,
    }),
  });
} catch (historyError) {
  console.error(
    "Failed to save question history:",
    historyError
  );
}
    } catch (error) {
      console.error(error);

      setAnswer(
        "Something went wrong. Please try again."
      );

      setSources([]);
      setSafetyNotice("");
      setRetrieval(null);
      setSelectedSource(null);
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory =
    retrieval?.selectedCategory ||
    selectedSource?.category ||
    "";

  const categoryMatch =
    retrieval?.categoryMatch ||
    selectedSource?.categoryMatch;

  const categoryMatchDisplay =
    getCategoryMatch(categoryMatch);

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
            className="text-emerald-400"
          >
            Islamic Assistant
          </a>

          <a
            href="/finance"
            className="hover:text-white"
          >
            Halal Finance
          </a>

          <a
            href="/learn"
            className="hover:text-white"
          >
            Learn
          </a>
        </div>
      </nav>

      {/* Main Section */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        {/* Heading */}
        <div className="text-center">
          <div className="mb-5 text-5xl">
            🤖
          </div>

          <h1 className="text-4xl font-bold md:text-5xl">
            Islamic Assistant
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-slate-400">
            Ask questions about Islam and
            get simple, source-grounded
            explanations.
          </p>
        </div>

        {/* Question Box */}
        <div className="mt-12 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <label className="mb-3 block text-sm font-medium text-slate-300">
            Your Question
          </label>

          <textarea
            value={question}
            onChange={(e) =>
              setQuestion(e.target.value)
            }
            placeholder="For example: What is riba?"
            className="min-h-32 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 p-4 text-white outline-none placeholder:text-slate-600 focus:border-emerald-500"
          />

          <button
            onClick={askQuestion}
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Checking verified sources..."
              : "Ask Question"}
          </button>
        </div>

        {/* Answer and Safety */}
        {answer && (
          <div className="mt-8 space-y-6">
            {/* Answer Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-2xl">
                  💡
                </span>

                <h2 className="text-xl font-semibold">
                  Answer
                </h2>
              </div>

              <p className="leading-7 text-slate-300">
                {answer}
              </p>
            </div>

            {/* Safety Notice */}
            {safetyNotice && (
              <div className="rounded-xl border border-amber-900/60 bg-amber-950/30 p-5">
                <div className="flex items-start gap-3">
                  <span className="text-xl">
                    ⚠️
                  </span>

                  <div>
                    <h2 className="font-semibold text-amber-300">
                      Important Islamic Guidance Notice
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-amber-200">
                      {safetyNotice}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Knowledge Classification */}
            {(retrieval ||
              selectedSource) && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="mb-5 flex items-center gap-3">
                  <span className="text-2xl">
                    🧭
                  </span>

                  <div>
                    <h2 className="text-xl font-semibold">
                      Knowledge Classification
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      How HalalWise classified
                      this question and its
                      selected source
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-slate-300">
                  <p>
                    <strong className="text-slate-200">
                      Knowledge category:
                    </strong>{" "}
                    {formatCategory(
                      retrieval?.detectedCategory
                    )}
                  </p>

                  <p>
                    <strong className="text-slate-200">
                      Source category:
                    </strong>{" "}
                    {formatCategory(
                      selectedCategory
                    )}
                  </p>

                  <p>
                    <strong className="text-slate-200">
                      Category match:
                    </strong>{" "}
                    <span
                      className={
                        categoryMatchDisplay.className
                      }
                    >
                      {
                        categoryMatchDisplay.text
                      }
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Sources */}
            {sources.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="mb-5 flex items-center gap-3">
                  <span className="text-2xl">
                    📚
                  </span>

                  <div>
                    <h2 className="text-xl font-semibold">
                      Sources & References
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Information used to
                      ground this answer
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {sources.map(
                    (source, index) => {
                      const sourceCategoryMatch =
                        getCategoryMatch(
                          source.categoryMatch
                        );

                      return (
                        <div
                          key={
                            source.sourceId ||
                            index
                          }
                          className="rounded-xl border border-slate-700 bg-slate-950 p-5"
                        >
                          {/* Source Title */}
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-emerald-400">
                              {source.title}
                            </h3>

                            {source.verified && (
                              <span className="rounded-full border border-emerald-800 bg-emerald-950/40 px-2 py-1 text-xs font-medium text-emerald-300">
                                ✓ Verified
                              </span>
                            )}
                          </div>

                          {/* Source Category */}
                          {source.category && (
                            <p className="mt-3 text-sm text-slate-300">
                              <strong className="text-slate-200">
                                Category:
                              </strong>{" "}
                              {formatCategory(
                                source.category
                              )}{" "}
                              <span
                                className={
                                  sourceCategoryMatch.className
                                }
                              >
                                {
                                  sourceCategoryMatch.text
                                }
                              </span>
                            </p>
                          )}

                          {/* Source Name */}
                          <p className="mt-1 text-sm text-slate-300">
                            <strong className="text-slate-200">
                              Source:
                            </strong>{" "}
                            {source.sourceName ||
                              source.sourceType}
                          </p>

                          {/* Source Type */}
                          {source.sourceType && (
                            <p className="mt-1 text-sm text-slate-300">
                              <strong className="text-slate-200">
                                Type:
                              </strong>{" "}
                              {source.sourceType}
                            </p>
                          )}

                          {/* Reference + Clickable Source Link */}
                          {source.reference && (
                            <p className="mt-1 text-sm text-slate-300">
                              <strong className="text-slate-200">
                                Reference:
                              </strong>{" "}
                              {source.reference}

                              {source.sourceUrl && (
                                <>
                                  {" "}
                                  <a
                                    href={
                                      source.sourceUrl
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
                                  >
                                    View source ↗
                                  </a>
                                </>
                              )}
                            </p>
                          )}

                          {/* Qur'an Save */}
                          {source.reference &&
                            !source.hadith &&
                            formatCategory(
                              source.category
                            ) === "Qur'an" && (
                              <>
                                <pre className="mt-4 overflow-auto rounded-lg bg-black p-4 text-xs text-green-400">
                                  {JSON.stringify(
                                    source,
                                    null,
                                    2
                                  )}
                                </pre>

                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleSaveQuran(
                                      source
                                    )
                                  }
                                  disabled={
                                    savingQuran ===
                                    source.reference
                                  }
                                  className="mt-4 w-full rounded-lg border border-slate-600 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-emerald-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {savingQuran ===
                                  source.reference
                                    ? "Saving..."
                                    : savedQuran.includes(
                                        source.reference
                                      )
                                    ? "✓ Saved Qur'an"
                                    : "🔖 Save Qur'an"}
                                </button>
                              </>
                            )}

                          {/* Authority */}
                          {source.authorityLevel && (
                            <p className="mt-1 text-sm text-slate-300">
                              <strong className="text-slate-200">
                                Authority:
                              </strong>{" "}
                              {
                                source.authorityLevel
                              }
                            </p>
                          )}

                          {/* Authenticity */}
                          {source.authenticity && (
                            <div className="mt-1 text-sm text-slate-300">
                              <p>
                                <strong className="text-slate-200">
                                  Authenticity:
                                </strong>{" "}
                                {typeof source.authenticity ===
                                "object"
                                  ? source.authenticity
                                      .grade
                                  : source.authenticity}
                              </p>

                              {typeof source.authenticity ===
                                "object" &&
                                source.authenticity
                                  .methodology && (
                                  <p className="mt-1">
                                    <strong className="text-slate-200">
                                      Authenticity Methodology:
                                    </strong>{" "}
                                    {
                                      source
                                        .authenticity
                                        .methodology
                                    }
                                  </p>
                                )}
                            </div>
                          )}

                          {/* Madhhab */}
                          {source.madhhab && (
                            <p className="mt-1 text-sm text-slate-300">
                              <strong className="text-slate-200">
                                Madhhab:
                              </strong>{" "}
                              {source.madhhab}
                            </p>
                          )}

                          {/* Methodology */}
                          {source.methodology && (
                            <p className="mt-1 text-sm text-slate-300">
                              <strong className="text-slate-200">
                                Methodology:
                              </strong>{" "}
                              {source.methodology}
                            </p>
                          )}

                          {/* Source Verification */}
                          <div className="mt-4 rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-4">
                            <div className="flex items-center gap-2">
                              <span className="text-lg text-emerald-400">
                                ✓
                              </span>

                              <p className="text-sm font-semibold text-emerald-300">
                                Verified source
                              </p>
                            </div>

                            {source.verifiedBy && (
                              <p className="mt-2 text-xs text-slate-400">
                                Verified by:{" "}
                                {
                                  source.verifiedBy
                                }
                              </p>
                            )}

                            {source.verifiedAt && (
                              <p className="mt-1 text-xs text-slate-500">
                                Verified at:{" "}
                                {new Date(
                                  source.verifiedAt
                                ).toLocaleDateString()}
                              </p>
                            )}
                          </div>

                          {/* Hadith Debug */}
                          {source.hadith && (
                            <pre className="mt-4 overflow-auto rounded-lg bg-black p-4 text-xs text-green-400">
                              {JSON.stringify(
                                source.hadith,
                                null,
                                2
                              )}
                            </pre>
                          )}

                          {/* Verified Hadith Details */}
                          {source.hadith && (
                            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900 p-4">
                              <h4 className="text-sm font-semibold text-slate-200">
                                Hadith Details
                              </h4>

                              {/* Narrator */}
                              {source.hadith
                                .narrator && (
                                <p className="mt-3 text-sm text-slate-300">
                                  <strong className="text-slate-200">
                                    Narrator:
                                  </strong>{" "}
                                  {
                                    source.hadith
                                      .narrator
                                  }
                                </p>
                              )}

                              {/* Arabic */}
                              {source.hadith
                                .arabicText && (
                                <div className="mt-4">
                                  <p className="mb-2 text-sm font-semibold text-slate-200">
                                    Arabic:
                                  </p>

                                  <p
                                    dir="rtl"
                                    lang="ar"
                                    className="rounded-lg bg-slate-950 p-4 text-right text-lg leading-10 text-slate-200"
                                  >
                                    {
                                      source
                                        .hadith
                                        .arabicText
                                    }
                                  </p>
                                </div>
                              )}

                              {/* Translation */}
                              {source.hadith
                                .translation
                                ?.text && (
                                <div className="mt-4">
                                  <p className="mb-2 text-sm font-semibold text-slate-200">
                                    English Translation:
                                  </p>

                                  <p className="rounded-lg bg-slate-950 p-4 text-sm leading-7 text-slate-300">
                                    {
                                      source
                                        .hadith
                                        .translation
                                        .text
                                    }
                                  </p>
                                </div>
                              )}

                              {/* Hadith Reference */}
                              {source.hadith
                                .reference && (
                                <p className="mt-4 text-xs text-slate-500">
                                  Reference:{" "}
                                  {
                                    source
                                      .hadith
                                      .reference
                                  }
                                </p>
                              )}

                              {source.reference && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleSaveHadith(
                                      source
                                    )
                                  }
                                  disabled={
                                    savingHadith ===
                                    source.reference
                                  }
                                  className="mt-4 w-full rounded-lg border border-slate-600 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-emerald-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {savingHadith ===
                                  source.reference
                                    ? "Saving..."
                                    : savedHadith.includes(
                                        source.reference
                                      )
                                    ? "✓ Saved Hadith"
                                    : "🔖 Save Hadith"}
                                </button>
                              )}
                            </div>
                          )}

                          {/* Clear Quran Translation Verification */}
                          {source.translationName && (
                            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900 p-4">
                              <h4 className="text-sm font-semibold text-slate-200">
                                Translation Verification
                              </h4>

                              <div className="mt-3 space-y-1">
                                <p className="text-sm text-slate-300">
                                  <strong className="text-slate-200">
                                    Translation:
                                  </strong>{" "}
                                  {
                                    source.translationName
                                  }
                                </p>

                                {source.translator && (
                                  <p className="text-sm text-slate-300">
                                    <strong className="text-slate-200">
                                      Translator:
                                    </strong>{" "}
                                    {
                                      source.translator
                                    }
                                  </p>
                                )}

                                {source.translationVerified && (
                                  <p className="mt-2 text-sm font-medium text-emerald-400">
                                    ✓ Translation independently verified
                                  </p>
                                )}

                                {source.translationVerifiedBy && (
                                  <p className="text-xs text-slate-400">
                                    Verified by:{" "}
                                    {
                                      source.translationVerifiedBy
                                    }
                                  </p>
                                )}

                                {source.translationVerifiedAt && (
                                  <p className="text-xs text-slate-500">
                                    Verified at:{" "}
                                    {new Date(
                                      source.translationVerifiedAt
                                    ).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Attribution */}
                          {source.attributionRequired &&
                            source.attributionText && (
                              <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900 p-4">
                                <h4 className="text-sm font-semibold text-slate-200">
                                  Attribution
                                </h4>

                                <p className="mt-2 text-sm leading-6 text-slate-400">
                                  {
                                    source.attributionText
                                  }
                                </p>
                              </div>
                            )}

                          {/* License */}
                          {source.licenseName && (
                            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900 p-4">
                              <h4 className="text-sm font-semibold text-slate-200">
                                License
                              </h4>

                              <p className="mt-2 text-sm text-slate-300">
                                {
                                  source.licenseName
                                }
                              </p>

                              {source.licenseStatus && (
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                  {
                                    source.licenseStatus
                                  }
                                </p>
                              )}
                            </div>
                          )}

                          {/* Citation ID */}
                          {source.sourceId && (
                            <p className="mt-4 break-all text-xs text-slate-600">
                              Source ID:{" "}
                              {source.sourceId}
                            </p>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            )}

            {/* Fallback Notice */}
            {sources.some(
              (source) =>
                source.usedFallback
            ) && (
              <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-5 text-sm text-amber-200">
                <strong>
                  Verification notice:
                </strong>{" "}
                The generated answer contained
                information that could not be
                sufficiently verified against the
                source. HalalWise therefore used
                the verified source content instead.
              </div>
            )}
          </div>
        )}

        {/* Example Questions */}
        <div className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">
            Try asking
          </h2>

          <div className="grid gap-3 md:grid-cols-2">
            <button
              onClick={() =>
                setQuestion("What is riba?")
              }
              className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-left text-slate-300 transition hover:border-emerald-500"
            >
              What is riba?
            </button>

            <button
              onClick={() =>
                setQuestion("What is gharar?")
              }
              className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-left text-slate-300 transition hover:border-emerald-500"
            >
              What is gharar?
            </button>

            <button
              onClick={() =>
                setQuestion(
                  "What is halal investing?"
                )
              }
              className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-left text-slate-300 transition hover:border-emerald-500"
            >
              What is halal investing?
            </button>

            <button
              onClick={() =>
                setQuestion("What is zakat?")
              }
              className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-left text-slate-300 transition hover:border-emerald-500"
            >
              What is zakat?
            </button>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-10 rounded-xl border border-amber-900/50 bg-amber-950/20 p-5 text-sm text-amber-200">
          <strong>Important:</strong>{" "}
          HalalWise is an educational information
          tool. Its answers should not be treated
          as a fatwa or a substitute for qualified
          Islamic scholarship. Where scholarly
          opinions differ, the application should
          clearly identify the differences.
        </div>
      </section>
    </main>
  );
}

