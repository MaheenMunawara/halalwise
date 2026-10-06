
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Source = {
  id: string;
  sourceType?: string;
  sourceName?: string;
  sourceCategory?: string;
  reference?: string;
  authorityLevel?: string;
  authenticity?: string;
  madhhab?: string;
  methodology?: string;
  verified?: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  sourceUrl?: string;
  verificationStatus?: string;
};

type RelatedLesson = {
  id: string;
  categoryId: string;
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  estimatedMinutes: number;
};

type NavigationLesson = {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  order: number;
  estimatedMinutes: number;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

type Lesson = {
  id: string;
  categoryId: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  order: number;
  estimatedMinutes: number;
  sourceIds: string[];
  relatedLessonIds: string[];
  published: boolean;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
};

type LearningProgressItem = {
  id?: string;
  lessonId: string;
  lessonTitle: string;
  completedAt: string;
};

export default function LessonPage() {
  const params = useParams();

  const categorySlug = params.category as string;
  const lessonSlug = params.lesson as string;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [relatedLessons, setRelatedLessons] = useState<RelatedLesson[]>([]);

  const [previousLesson, setPreviousLesson] =
    useState<NavigationLesson | null>(null);

  const [nextLesson, setNextLesson] =
    useState<NavigationLesson | null>(null);

  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);

  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  useEffect(() => {
    if (!categorySlug || !lessonSlug) {
      return;
    }

    async function loadLesson() {
      try {
        setLoading(true);

        const lessonResponse = await fetch(
          `/api/learn/lesson?category=${encodeURIComponent(
            categorySlug
          )}&lesson=${encodeURIComponent(lessonSlug)}`
        );

        const lessonData = await lessonResponse.json();

        if (!lessonData.success) {
          return;
        }

        setLesson(lessonData.lesson);
        setCategory(lessonData.category);

        const lessonId = lessonData.lesson.id;

        const [
          sourcesResponse,
          relatedResponse,
          progressResponse,
          navigationResponse,
          bookmarksResponse,
        ] = await Promise.all([
          fetch(
            `/api/learn/lesson/sources?lessonId=${encodeURIComponent(
              lessonId
            )}`
          ),
          fetch(
            `/api/learn/lesson/related?lessonId=${encodeURIComponent(
              lessonId
            )}`
          ),
          fetch("/api/learning-progress"),
          fetch(
            `/api/learn/lesson/navigation?category=${encodeURIComponent(
              categorySlug
            )}&lesson=${encodeURIComponent(lessonSlug)}`
          ),
          fetch("/api/bookmarks"),
        ]);

        const sourcesData = await sourcesResponse.json();
        const relatedData = await relatedResponse.json();
        const progressData = await progressResponse.json();
        const navigationData = await navigationResponse.json();
        const bookmarksData = await bookmarksResponse.json();

        if (sourcesData.success) {
          setSources(sourcesData.sources || []);
        }

        if (relatedData.success) {
          setRelatedLessons(relatedData.lessons || []);
        }

        if (
          progressResponse.ok &&
          progressData.success
        ) {
          const progressItems: LearningProgressItem[] =
            progressData.progress || [];

          const lessonCompleted =
            progressItems.some(
              (item) => item.lessonId === lessonId
            );

          setCompleted(lessonCompleted);
        } else {
          setCompleted(false);
        }

        if (navigationData.success) {
          setPreviousLesson(
            navigationData.previousLesson || null
          );

          setNextLesson(
            navigationData.nextLesson || null
          );
        }

        if (bookmarksData.success) {
          const lessonIsBookmarked =
            (bookmarksData.bookmarks || []).some(
              (bookmark: {
                contentType?: string;
                contentId?: string;
              }) =>
                bookmark.contentType === "lesson" &&
                bookmark.contentId === lessonId
            );

          setBookmarked(lessonIsBookmarked);
        }
      } catch (error) {
        console.error(
          "Failed to load lesson:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadLesson();
  }, [categorySlug, lessonSlug]);

  async function markCompleted() {
    if (!lesson || saving || completed) {
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        "/api/learning-progress",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lessonId: lesson.id,
            lessonTitle: lesson.title,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (response.status === 401) {
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

      setCompleted(true);
    } catch (error) {
      console.error(
        "Failed to save progress:",
        error
      );

      alert(
        "Unable to save your learning progress. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleBookmark() {
    if (!lesson || bookmarkLoading) {
      return;
    }

    try {
      setBookmarkLoading(true);

      if (bookmarked) {
        const response = await fetch(
          "/api/bookmarks",
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contentType: "lesson",
              contentId: lesson.id,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              "Failed to remove bookmark."
          );
        }

        setBookmarked(false);
      } else {
        const response = await fetch(
          "/api/bookmarks",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contentType: "lesson",
              contentId: lesson.id,
              title: lesson.title,
              description: lesson.description,
              url: `/learn/${categorySlug}/${lesson.slug}`,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              "Failed to save bookmark."
          );
        }

        setBookmarked(true);
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
      setBookmarkLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <p>Loading lesson...</p>
      </main>
    );
  }

  if (!lesson || !category) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-2xl font-bold">
          Lesson not found
        </h1>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <a
            href={`/learn/${category.slug}`}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back to {category.name}
          </a>
        </div>

        <div className="mb-8">
          <p className="mb-2 text-sm font-medium text-blue-600">
            {category.name}
          </p>

          <h1 className="mb-4 text-4xl font-bold">
            {lesson.title}
          </h1>

          <p className="text-lg text-gray-600">
            {lesson.description}
          </p>
        </div>

        <div className="mb-8 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">
            {lesson.difficulty}
          </span>

          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">
            {lesson.estimatedMinutes} min
          </span>

          <button
            type="button"
            onClick={toggleBookmark}
            disabled={bookmarkLoading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {bookmarkLoading
              ? "Saving..."
              : bookmarked
              ? "✓ Saved"
              : "🔖 Save Bookmark"}
          </button>
        </div>

        <section className="mb-10 rounded-xl border p-6">
          <h2 className="mb-4 text-2xl font-semibold">
            Lesson
          </h2>

          <div className="whitespace-pre-line leading-7 text-gray-700">
            {lesson.content}
          </div>
        </section>

        <section className="mb-10 rounded-xl border p-6">
          <h2 className="mb-4 text-2xl font-semibold">
            Lesson Progress
          </h2>

          <button
            type="button"
            onClick={markCompleted}
            disabled={saving || completed}
            className="rounded-lg bg-black px-5 py-3 text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? "Saving..."
              : completed
              ? "✓ Completed"
              : "Mark as completed"}
          </button>
        </section>

        {sources.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-semibold">
              Verified Sources
            </h2>

            <div className="space-y-4">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="rounded-xl border p-5"
                >
                  <h3 className="font-semibold">
                    {source.sourceName}
                  </h3>

                  {source.reference && (
                    <p className="mt-1 text-sm text-gray-600">
                      {source.reference}
                    </p>
                  )}

                  {source.authenticity && (
                    <p className="mt-1 text-sm">
                      Authenticity:{" "}
                      {source.authenticity}
                    </p>
                  )}

                  {source.verified && (
                    <p className="mt-2 text-sm font-medium text-green-600">
                      ✓ Verified
                    </p>
                  )}

                  {source.sourceUrl && (
                    <a
                      href={source.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block text-sm text-blue-600 hover:underline"
                    >
                      View source →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {relatedLessons.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-semibold">
              Related Lessons
            </h2>

            <div className="space-y-4">
              {relatedLessons.map(
                (relatedLesson) => (
                  <a
                    key={relatedLesson.id}
                    href={`/learn/${relatedLesson.categoryId}/${relatedLesson.slug}`}
                    className="block rounded-xl border p-5 transition hover:bg-gray-50"
                  >
                    <h3 className="font-semibold">
                      {relatedLesson.title}
                    </h3>

                    <p className="mt-2 text-sm text-gray-600">
                      {
                        relatedLesson.description
                      }
                    </p>

                    <p className="mt-2 text-sm text-gray-500">
                      {relatedLesson.difficulty}{" "}
                      ·{" "}
                      {
                        relatedLesson.estimatedMinutes
                      }{" "}
                      min
                    </p>
                  </a>
                )
              )}
            </div>
          </section>
        )}

        <section className="mt-12 border-t pt-8">
          <div className="flex items-center justify-between gap-4">
            {previousLesson ? (
              <a
                href={`/learn/${previousLesson.category?.slug}/${previousLesson.slug}`}
                className="max-w-[45%] rounded-xl border px-5 py-4 transition hover:bg-gray-50"
              >
                <p className="mb-1 text-sm text-gray-500">
                  ← Previous Lesson
                </p>

                <p className="font-semibold">
                  {previousLesson.title}
                </p>
              </a>
            ) : (
              <div />
            )}

            {nextLesson ? (
              <a
                href={`/learn/${nextLesson.category?.slug}/${nextLesson.slug}`}
                className="max-w-[45%] rounded-xl border px-5 py-4 text-right transition hover:bg-gray-50"
              >
                <p className="mb-1 text-sm text-gray-500">
                  Next Lesson →
                </p>

                <p className="font-semibold">
                  {nextLesson.title}
                </p>
              </a>
            ) : (
              <div />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
