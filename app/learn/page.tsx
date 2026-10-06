
"use client";

import { useEffect, useState } from "react";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  order: number;
  published?: boolean;
};

type Lesson = {
  id: string;
  categoryId: string;
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  estimatedMinutes: number;
  order?: number;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

type LearningProgressItem = {
  id?: string;
  lessonId: string;
  lessonTitle: string;
  completedAt: string;
};

type ProgressSummary = {
  totalLessons: number;
  completedLessons: number;
  remainingLessons: number;
  progressPercentage: number;
};

export default function LearnPage() {
  const [categories, setCategories] = useState<Category[]>(
    []
  );

  const [summary, setSummary] =
    useState<ProgressSummary | null>(null);

  const [continueLesson, setContinueLesson] =
    useState<Lesson | null>(null);

  const [completedLessons, setCompletedLessons] =
    useState<Lesson[]>([]);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [searchResults, setSearchResults] =
    useState<Lesson[]>([]);

  const [suggestions, setSuggestions] =
    useState<Lesson[]>([]);

  const [searching, setSearching] =
    useState(false);

  const [loadingSuggestions, setLoadingSuggestions] =
    useState(false);

  const [hasSearched, setHasSearched] =
    useState(false);

  const [searchError, setSearchError] =
    useState("");

  const [showSuggestions, setShowSuggestions] =
    useState(false);

  const [bookmarkedLessons, setBookmarkedLessons] =
    useState<string[]>([]);

  const [bookmarkLoading, setBookmarkLoading] =
    useState<string | null>(null);

  const [completedLessonIds, setCompletedLessonIds] =
    useState<string[]>([]);

  const [completionLoading, setCompletionLoading] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadLearnData() {
      try {
        /*
         * Load the catalogue, bookmarks and
         * authenticated learning progress.
         */
        const [
          categoriesResponse,
          bookmarksResponse,
          learningProgressResponse,
        ] = await Promise.all([
          fetch("/api/learn"),
          fetch("/api/bookmarks"),
          fetch("/api/learning-progress"),
        ]);

        const categoriesData =
          await categoriesResponse.json();

        const bookmarksData =
          await bookmarksResponse.json();

        const learningProgressData =
          await learningProgressResponse.json();

        /*
         * --------------------------------------------------
         * 1. LOAD PUBLISHED CATEGORIES
         * --------------------------------------------------
         */

        let loadedCategories: Category[] = [];

        if (
          categoriesResponse.ok &&
          categoriesData.success
        ) {
          loadedCategories =
            categoriesData.categories || [];

          loadedCategories =
            [...loadedCategories].sort(
              (a, b) =>
                (a.order ?? 0) -
                (b.order ?? 0)
            );

          setCategories(
            loadedCategories
          );
        }

        /*
         * --------------------------------------------------
         * 2. LOAD ALL PUBLISHED LESSONS
         * --------------------------------------------------
         *
         * /api/learn gives us categories.
         *
         * /api/learn?slug=... gives us the
         * published lessons for that category.
         *
         * This becomes the real lesson catalogue.
         */

        const lessonResponses =
          await Promise.all(
            loadedCategories.map(
              async (category) => {
                try {
                  const response =
                    await fetch(
                      `/api/learn?slug=${encodeURIComponent(
                        category.slug
                      )}`
                    );

                  if (!response.ok) {
                    return [];
                  }

                  const data =
                    await response.json();

                  if (
                    !data.success
                  ) {
                    return [];
                  }

                  const lessons: Lesson[] =
                    data.lessons || [];

                  /*
                   * Add category information
                   * so the lesson can be used
                   * directly by the UI.
                   */
                  return lessons
                    .map(
                      (lesson) => ({
                        ...lesson,
                        category: {
                          id: category.id,
                          name: category.name,
                          slug: category.slug,
                        },
                      })
                    )
                    .sort(
                      (a, b) =>
                        (a.order ?? 0) -
                        (b.order ?? 0)
                    );
                } catch (error) {
                  console.error(
                    `Failed to load lessons for ${category.slug}:`,
                    error
                  );

                  return [];
                }
              }
            )
          );

        /*
         * Keep category order first,
         * then lesson order inside each category.
         *
         * Do NOT sort all lessons only by lesson.order,
         * because every category can have order 1,
         * order 2, order 3, etc.
         */
        const allLessons: Lesson[] =
          lessonResponses.flat();

        /*
         * --------------------------------------------------
         * 3. LOAD BOOKMARKS
         * --------------------------------------------------
         */

        if (
          bookmarksResponse.ok &&
          bookmarksData.success
        ) {
          const lessonBookmarks = (
            bookmarksData.bookmarks || []
          )
            .filter(
              (bookmark: {
                contentType?: string;
                contentId?: string;
              }) =>
                bookmark.contentType ===
                "lesson"
            )
            .map(
              (bookmark: {
                contentId?: string;
              }) =>
                bookmark.contentId
            )
            .filter(
              (
                contentId:
                  | string
                  | undefined
              ): contentId is string =>
                Boolean(contentId)
            );

          setBookmarkedLessons(
            lessonBookmarks
          );
        }

        /*
         * --------------------------------------------------
         * 4. LOAD LEARNING PROGRESS
         * --------------------------------------------------
         */

        let progressItems: LearningProgressItem[] =
          [];

        if (
          learningProgressResponse.ok &&
          learningProgressData.success
        ) {
          progressItems =
            learningProgressData.progress ||
            [];
        }

        /*
         * Get only valid lesson IDs that
         * actually exist in the catalogue.
         */
        const catalogueLessonIds =
          new Set(
            allLessons.map(
              (lesson) => lesson.id
            )
          );

        const progressIds =
          progressItems
            .map(
              (item) =>
                item.lessonId
            )
            .filter(
              (
                lessonId
              ): lessonId is string =>
                Boolean(
                  lessonId
                ) &&
                catalogueLessonIds.has(
                  lessonId
                )
            );

        /*
         * Remove duplicate progress IDs.
         */
        const uniqueProgressIds =
          Array.from(
            new Set(
              progressIds
            )
          );

        setCompletedLessonIds(
          uniqueProgressIds
        );

        /*
         * --------------------------------------------------
         * 5. RESOLVE COMPLETED LESSONS
         * --------------------------------------------------
         *
         * We no longer need to call
         * /api/learn/search for every completed
         * lesson.
         *
         * We already have the complete catalogue.
         */
        const completedSet =
          new Set(
            uniqueProgressIds
          );

        const uniqueCompletedLessons =
          allLessons.filter(
            (lesson) =>
              completedSet.has(
                lesson.id
              )
          );

        setCompletedLessons(
          uniqueCompletedLessons
        );

        /*
         * --------------------------------------------------
         * 6. CALCULATE REAL LEARNING PROGRESS
         * --------------------------------------------------
         *
         * This is the important fix.
         *
         * totalLessons is the number of actual
         * published lessons in the database,
         * not the number of completed lessons.
         */
        const totalLessons =
          allLessons.length;

        const completedCount =
          uniqueProgressIds.length;

        const remainingLessons =
          Math.max(
            totalLessons -
              completedCount,
            0
          );

        const progressPercentage =
          totalLessons > 0
            ? Math.min(
                Math.round(
                  (completedCount /
                    totalLessons) *
                    100
                ),
                100
              )
            : 0;

        setSummary({
          totalLessons,
          completedLessons:
            completedCount,
          remainingLessons,
          progressPercentage,
        });

        /*
         * --------------------------------------------------
         * 7. FIND FIRST INCOMPLETE LESSON
         * --------------------------------------------------
         *
         * Because allLessons is already ordered by:
         *
         * Category order
         *      ↓
         * Lesson order
         *
         * the first incomplete lesson is the
         * correct Continue Learning lesson.
         */
        const firstIncomplete =
          allLessons.find(
            (lesson) =>
              !completedSet.has(
                lesson.id
              )
          );

        setContinueLesson(
          firstIncomplete || null
        );
      } catch (error) {
        console.error(
          "Failed to load Learn data:",
          error
        );

        setSummary(null);
        setContinueLesson(null);
      }
    }

    
    loadLearnData();

    const handleFocus = () => {
      loadLearnData();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  /*
   * --------------------------------------------------
   * SEARCH SUGGESTIONS
   * --------------------------------------------------
   */

  useEffect(() => {
    const query =
      searchQuery.trim();

    if (query.length < 2) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    const timeout =
      setTimeout(
        async () => {
          try {
            setLoadingSuggestions(
              true
            );

            const response =
              await fetch(
                `/api/learn/search?q=${encodeURIComponent(
                  query
                )}`
              );

            if (!response.ok) {
              throw new Error(
                "Suggestion request failed."
              );
            }

            const data =
              await response.json();

            if (
              data.success
            ) {
              setSuggestions(
                (
                  data.lessons ||
                  []
                ).slice(0, 5)
              );
            } else {
              setSuggestions(
                []
              );
            }
          } catch (error) {
            console.error(
              "Learn suggestions failed:",
              error
            );

            setSuggestions([]);
          } finally {
            setLoadingSuggestions(
              false
            );
          }
        },
        350
      );

    return () =>
      clearTimeout(
        timeout
      );
  }, [searchQuery]);

  /*
   * --------------------------------------------------
   * SEARCH
   * --------------------------------------------------
   */

  async function handleSearch() {
    const query =
      searchQuery.trim();

    if (!query) {
      setSearchResults([]);
      setHasSearched(false);
      setSearchError("");
      setShowSuggestions(false);
      return;
    }

    try {
      setSearching(true);
      setHasSearched(true);
      setSearchError("");
      setShowSuggestions(false);

      const response =
        await fetch(
          `/api/learn/search?q=${encodeURIComponent(
            query
          )}`
        );

      if (!response.ok) {
        throw new Error(
          "Search request failed."
        );
      }

      const data =
        await response.json();

      if (!data.success) {
        throw new Error(
          data.error ||
            "Search request failed."
        );
      }

      setSearchResults(
        data.lessons || []
      );
    } catch (error) {
      console.error(
        "Learn search failed:",
        error
      );

      setSearchResults([]);
      setSearchError(
        "Something went wrong while searching. Please try again."
      );
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setSearchQuery("");
    setSearchResults([]);
    setSuggestions([]);
    setHasSearched(false);
    setSearchError("");
    setShowSuggestions(false);
  }

  function selectSuggestion(
    lesson: Lesson
  ) {
    setShowSuggestions(false);

    window.location.href =
      `/learn/${
        lesson.category?.slug ||
        lesson.categoryId
      }/${lesson.slug}`;
  }

  function handleSearchKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      handleSearch();
    }

    if (event.key === "Escape") {
      clearSearch();
    }
  }

  /*
   * --------------------------------------------------
   * BOOKMARKS
   * --------------------------------------------------
   */

  async function toggleBookmark(
    lesson: Lesson
  ) {
    if (
      bookmarkLoading ===
      lesson.id
    ) {
      return;
    }

    const isBookmarked =
      bookmarkedLessons.includes(
        lesson.id
      );

    try {
      setBookmarkLoading(
        lesson.id
      );

      if (isBookmarked) {
        const response =
          await fetch(
            "/api/bookmarks",
            {
              method: "DELETE",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                contentType:
                  "lesson",
                contentId:
                  lesson.id,
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
              "Failed to remove bookmark."
          );
        }

        setBookmarkedLessons(
          (current) =>
            current.filter(
              (id) =>
                id !== lesson.id
            )
        );
      } else {
        const categorySlug =
          lesson.category?.slug ||
          lesson.categoryId;

        const response =
          await fetch(
            "/api/bookmarks",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                contentType:
                  "lesson",
                contentId:
                  lesson.id,
                title:
                  lesson.title,
                description:
                  lesson.description,
                url: `/learn/${categorySlug}/${lesson.slug}`,
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
              "Failed to save bookmark."
          );
        }

        setBookmarkedLessons(
          (current) => [
            ...current,
            lesson.id,
          ]
        );
      }
    } catch (error) {
      console.error(
        "Bookmark action failed:",
        error
      );

      alert(
        "Please log in to save bookmarks, or try again."
      );
    } finally {
      setBookmarkLoading(
        null
      );
    }
  }

  /*
   * --------------------------------------------------
   * MARK LESSON COMPLETE
   * --------------------------------------------------
   */

  async function markLessonComplete(
    lesson: Lesson
  ) {
    if (
      completionLoading ===
        lesson.id ||
      completedLessonIds.includes(
        lesson.id
      )
    ) {
      return;
    }

    try {
      setCompletionLoading(
        lesson.id
      );

      const response =
        await fetch(
          "/api/learning-progress",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              lessonId:
                lesson.id,
              lessonTitle:
                lesson.title,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        if (
          response.status ===
          401
        ) {
          alert(
            "Please log in to save your learning progress."
          );
        } else {
          alert(
            data.error ||
              "Unable to save learning progress."
          );
        }

        return;
      }

      /*
       * Update completed IDs.
       */
      setCompletedLessonIds(
        (current) =>
          current.includes(
            lesson.id
          )
            ? current
            : [
                ...current,
                lesson.id,
              ]
      );

      /*
       * Update completed lessons.
       */
      setCompletedLessons(
        (current) => {
          if (
            current.some(
              (item) =>
                item.id ===
                lesson.id
            )
          ) {
            return current;
          }

          return [
            ...current,
            lesson,
          ];
        }
      );

      /*
       * Update summary.
       */
      setSummary(
        (current) => {
          if (!current) {
            return current;
          }

          const alreadyCompleted =
            completedLessonIds.includes(
              lesson.id
            );

          if (
            alreadyCompleted
          ) {
            return current;
          }

          const newCompleted =
            Math.min(
              current.completedLessons +
                1,
              current.totalLessons
            );

          const newRemaining =
            Math.max(
              current.totalLessons -
                newCompleted,
              0
            );

          const newPercentage =
            current.totalLessons >
            0
              ? Math.round(
                  (newCompleted /
                    current.totalLessons) *
                    100
                )
              : 0;

          return {
            ...current,
            completedLessons:
              newCompleted,
            remainingLessons:
              newRemaining,
            progressPercentage:
              newPercentage,
          };
        }
      );

      /*
       * Find the next incomplete lesson
       * from the existing catalogue.
       *
       * We don't have the catalogue in a
       * separate state variable, so reload
       * the Learn data after completion.
       */
      setContinueLesson(
        null
      );

      /*
       * If there is another incomplete lesson,
       * refresh the page data so Continue Learning
       * points to it.
       */
      try {
        const categoriesResponse =
          await fetch(
            "/api/learn"
          );

        if (
          categoriesResponse.ok
        ) {
          const categoriesData =
            await categoriesResponse.json();

          if (
            categoriesData.success
          ) {
            const categoryList =
              categoriesData.categories ||
              [];

            const lessonResponses =
              await Promise.all(
                categoryList.map(
                  async (
                    category: Category
                  ) => {
                    try {
                      const response =
                        await fetch(
                          `/api/learn?slug=${encodeURIComponent(
                            category.slug
                          )}`
                        );

                      if (
                        !response.ok
                      ) {
                        return [];
                      }

                      const data =
                        await response.json();

                      if (
                        !data.success
                      ) {
                        return [];
                      }

                      return (
                        data.lessons ||
                        []
                      )
                        .map(
                          (
                            item: Lesson
                          ) => ({
                            ...item,
                            category: {
                              id: category.id,
                              name: category.name,
                              slug: category.slug,
                            },
                          })
                        )
                        .sort(
                          (
                            a: Lesson,
                            b: Lesson
                          ) =>
                            (a.order ??
                              0) -
                            (b.order ??
                              0)
                        );
                    } catch {
                      return [];
                    }
                  }
                )
              );

            const allLessons =
              lessonResponses.flat();

            const updatedCompletedIds =
              new Set([
                ...completedLessonIds,
                lesson.id,
              ]);

            const nextLesson =
              allLessons.find(
                (
                  item: Lesson
                ) =>
                  !updatedCompletedIds.has(
                    item.id
                  )
              );

            setContinueLesson(
              nextLesson ||
                null
            );
          }
        }
      } catch (error) {
        console.error(
          "Failed to refresh Continue Learning:",
          error
        );
      }
    } catch (error) {
      console.error(
        "Failed to mark lesson complete:",
        error
      );

      alert(
        "Unable to save your learning progress. Please try again."
      );
    } finally {
      setCompletionLoading(
        null
      );
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8">
        {/* Header */}
        <section className="mb-8">
          <h1 className="mb-3 text-4xl font-bold text-gray-900">
            Learn
          </h1>

          <p className="max-w-2xl text-lg text-gray-600">
            Learn about Islam through
            simple, structured lessons
            based on verified sources.
          </p>
        </section>

        {/* Search */}
        <section className="mb-10">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="font-semibold text-gray-900">
                Search lessons
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Search by lesson title,
                topic, or keyword.
              </p>
            </div>

            <div className="relative">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <span
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    aria-hidden="true"
                  >
                    🔍
                  </span>

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(
                      event
                    ) => {
                      setSearchQuery(
                        event.target
                          .value
                      );

                      setShowSuggestions(
                        true
                      );
                    }}
                    onFocus={() => {
                      if (
                        searchQuery
                          .trim()
                          .length >=
                        2
                      ) {
                        setShowSuggestions(
                          true
                        );
                      }
                    }}
                    onKeyDown={
                      handleSearchKeyDown
                    }
                    placeholder="Search lessons..."
                    className="w-full rounded-xl border border-gray-300 bg-white px-11 py-4 pr-12 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
                    aria-label="Search lessons"
                  />

                  {searchQuery && (
                    <button
                      type="button"
                      onClick={
                        clearSearch
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xl text-gray-400 transition hover:text-gray-900"
                      aria-label="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={
                    handleSearch
                  }
                  disabled={searching}
                  className="rounded-xl bg-gray-900 px-7 py-4 font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {searching
                    ? "Searching..."
                    : "Search"}
                </button>
              </div>

              {/* Suggestions */}
              {showSuggestions &&
                searchQuery
                  .trim()
                  .length >= 2 &&
                (loadingSuggestions ||
                  suggestions.length >
                    0) && (
                  <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                    {loadingSuggestions ? (
                      <div className="px-5 py-4 text-sm text-gray-500">
                        Searching
                        suggestions...
                      </div>
                    ) : (
                      suggestions.map(
                        (lesson) => (
                          <button
                            key={
                              lesson.id
                            }
                            type="button"
                            onClick={() =>
                              selectSuggestion(
                                lesson
                              )
                            }
                            className="flex w-full items-center justify-between border-b border-gray-100 px-5 py-4 text-left transition last:border-b-0 hover:bg-gray-50"
                          >
                            <div>
                              <p className="font-medium text-gray-900">
                                {
                                  lesson.title
                                }
                              </p>

                              <p className="mt-1 text-sm text-gray-500">
                                {lesson
                                  .category
                                  ?.name ||
                                  "Learn"}
                              </p>
                            </div>

                            <span className="text-gray-400">
                              →
                            </span>
                          </button>
                        )
                      )
                    )}
                  </div>
                )}
            </div>
          </div>
        </section>

        {/* Search Results */}
        {hasSearched && (
          <section className="mb-12">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  Search Results
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Results for "
                  {searchQuery}"
                </p>
              </div>

              {!searching &&
                !searchError && (
                  <span className="rounded-full bg-gray-200 px-3 py-1 text-sm text-gray-700">
                    {
                      searchResults.length
                    }{" "}
                    {searchResults.length ===
                    1
                      ? "result"
                      : "results"}
                  </span>
                )}
            </div>

            {searching ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
                <div className="mb-3 text-3xl">
                  🔄
                </div>

                <h3 className="font-semibold text-gray-900">
                  Searching lessons...
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Looking through the
                  available lessons.
                </p>
              </div>
            ) : searchError ? (
              <div className="rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
                <div className="mb-3 text-3xl">
                  ⚠️
                </div>

                <h3 className="font-semibold text-gray-900">
                  Search failed
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  {searchError}
                </p>

                <button
                  type="button"
                  onClick={
                    handleSearch
                  }
                  className="mt-5 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-black"
                >
                  Try Again
                </button>
              </div>
            ) : searchResults.length ===
              0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
                <div className="mb-3 text-3xl">
                  🔎
                </div>

                <h3 className="font-semibold text-gray-900">
                  No lessons found
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Try a different keyword
                  or topic.
                </p>

                <button
                  type="button"
                  onClick={
                    clearSearch
                  }
                  className="mt-5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {searchResults.map(
                  (lesson) => {
                    const isCompleted =
                      completedLessonIds.includes(
                        lesson.id
                      );

                    const isCompleting =
                      completionLoading ===
                      lesson.id;

                    return (
                      <div
                        key={
                          lesson.id
                        }
                        className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
                      >
                        <a
                          href={`/learn/${
                            lesson
                              .category
                              ?.slug ||
                            lesson.categoryId
                          }/${lesson.slug}`}
                          className="block"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="text-sm font-medium text-blue-600">
                              {lesson
                                .category
                                ?.name ||
                                "Learn"}
                            </span>

                            <span className="text-sm text-gray-400 transition group-hover:text-gray-700">
                              →
                            </span>
                          </div>

                          <h3 className="text-xl font-semibold text-gray-900">
                            {
                              lesson.title
                            }
                          </h3>

                          <p className="mt-2 leading-6 text-gray-600">
                            {
                              lesson.description
                            }
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2 text-sm text-gray-500">
                            <span className="rounded-full bg-gray-100 px-3 py-1">
                              {
                                lesson.difficulty
                              }
                            </span>

                            <span className="rounded-full bg-gray-100 px-3 py-1">
                              {
                                lesson.estimatedMinutes
                              }{" "}
                              min
                            </span>
                          </div>
                        </a>

                        <div className="mt-5 grid gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() =>
                              markLessonComplete(
                                lesson
                              )
                            }
                            disabled={
                              isCompleted ||
                              isCompleting
                            }
                            className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                          >
                            {isCompleting
                              ? "Saving..."
                              : isCompleted
                              ? "✓ Completed"
                              : "Mark Complete"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              toggleBookmark(
                                lesson
                              )
                            }
                            disabled={
                              bookmarkLoading ===
                              lesson.id
                            }
                            className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition hover:border-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {bookmarkLoading ===
                            lesson.id
                              ? "Saving..."
                              : bookmarkedLessons.includes(
                                  lesson.id
                                )
                              ? "✓ Saved"
                              : "🔖 Save Bookmark"}
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </section>
        )}

        {/* Progress */}
        {summary &&
          summary.totalLessons > 0 && (
            <section className="mb-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-2xl font-semibold text-gray-900">
                Your Learning Progress
              </h2>

              <div className="mb-3 flex items-center justify-between text-gray-700">
                <span>
                  {
                    summary.completedLessons
                  }{" "}
                  of{" "}
                  {summary.totalLessons}{" "}
                  lessons completed
                </span>

                <span className="font-semibold text-gray-900">
                  {
                    summary.progressPercentage
                  }
                  %
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-gray-900 transition-all"
                  style={{
                    width: `${summary.progressPercentage}%`,
                  }}
                />
              </div>

              <p className="mt-3 text-sm text-gray-500">
                {
                  summary.remainingLessons
                }{" "}
                lessons remaining
              </p>
            </section>
          )}

        {/* Continue Learning */}
        {continueLesson && (
          <section className="mb-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="mb-2 text-sm font-medium text-blue-600">
              Continue Learning
            </p>

            <h2 className="text-2xl font-semibold text-gray-900">
              {continueLesson.title}
            </h2>

            <p className="mt-2 text-gray-600">
              {
                continueLesson.description
              }
            </p>

            <p className="mt-2 text-sm text-gray-500">
              {continueLesson.category
                ?.name ||
                "Learn"}
            </p>

            <a
              href={`/learn/${
                continueLesson
                  .category?.slug ||
                continueLesson.categoryId
              }/${continueLesson.slug}`}
              className="mt-5 inline-block rounded-lg bg-gray-900 px-5 py-3 text-white transition hover:bg-black"
            >
              Continue →
            </a>
          </section>
        )}

        {/* All Completed */}
        {summary &&
          summary.totalLessons > 0 &&
          summary.remainingLessons ===
            0 && (
            <section className="mb-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-gray-900">
                🎉 All lessons completed!
              </h2>

              <p className="mt-2 text-gray-600">
                You have completed all
                available Learn lessons.
              </p>
            </section>
          )}

        {/* Completed Lessons */}
        {completedLessons.length >
          0 && (
          <section className="mb-12">
            <h2 className="mb-5 text-2xl font-semibold text-gray-900">
              Completed Lessons
            </h2>

            <div className="space-y-4">
              {completedLessons.map(
                (lesson) => (
                  <a
                    key={lesson.id}
                    href={`/learn/${
                      lesson.category
                        ?.slug ||
                      lesson.categoryId
                    }/${lesson.slug}`}
                    className="block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:bg-gray-50"
                  >
                    <div className="mb-1 text-sm font-medium text-blue-600">
                      {lesson
                        .category
                        ?.name ||
                        "Learn"}
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900">
                      {lesson.title}
                    </h3>

                    <p className="mt-2 text-gray-600">
                      {
                        lesson.description
                      }
                    </p>

                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-500">
                      <span>
                        {
                          lesson.difficulty
                        }
                      </span>

                      <span>
                        {
                          lesson.estimatedMinutes
                        }{" "}
                        min
                      </span>

                      <span className="font-medium text-green-600">
                        ✓ Completed
                      </span>
                    </div>
                  </a>
                )
              )}
            </div>
          </section>
        )}

        {/* Explore Topics */}
        <section>
          <h2 className="mb-5 text-2xl font-semibold text-gray-900">
            Explore Topics
          </h2>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map(
              (category) => (
                <a
                  key={category.id}
                  href={`/learn/${category.slug}`}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
                >
                  <div className="mb-3 text-3xl">
                    {category.icon}
                  </div>

                  <h3 className="text-xl font-semibold text-gray-900">
                    {category.name}
                  </h3>

                  <p className="mt-2 text-gray-600">
                    {
                      category.description
                    }
                  </p>
                </a>
              )
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
