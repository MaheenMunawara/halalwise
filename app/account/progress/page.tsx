"use client";

import { useEffect, useMemo, useState } from "react";

type Category = {
id: string;
name: string;
slug: string;
order?: number;
};

type Lesson = {
id: string;
categoryId: string;
title: string;
slug: string;
description?: string;
difficulty?: string;
order?: number;
estimatedMinutes?: number;
category?: Category;
};

type ProgressItem = {
id: string;
lessonId: string;
lessonTitle: string;
completedAt: string;
};

export default function LearningProgressPage() {
const [progress, setProgress] = useState<ProgressItem[]>([]);
const [allLessons, setAllLessons] = useState<Lesson[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

async function loadProgress() {
try {
setLoading(true);
setError("");


  const [progressResponse, categoriesResponse] =
    await Promise.all([
      fetch("/api/learning-progress"),
      fetch("/api/learn"),
    ]);

  const progressData = await progressResponse.json();
  const categoriesData = await categoriesResponse.json();

  if (!progressResponse.ok || !progressData.success) {
    if (progressResponse.status === 401) {
      setError(
        "Please log in to view your learning progress."
      );
    } else {
      setError(
        progressData.error ||
          "Unable to load learning progress."
      );
    }

    return;
  }

  if (!categoriesResponse.ok || !categoriesData.success) {
    setError(
      categoriesData.error ||
        "Unable to load available lessons."
    );

    return;
  }

  const categories: Category[] =
    categoriesData.categories || [];

  const lessonResponses = await Promise.all(
    categories.map(async (category) => {
      try {
        const response = await fetch(
          `/api/learn?slug=${encodeURIComponent(
            category.slug
          )}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          return [];
        }

        const lessons: Lesson[] =
          data.lessons || [];

        return lessons.map((lesson) => ({
          ...lesson,
          categoryId: lesson.categoryId || category.id,
          category,
        }));
      } catch (error) {
        console.error(
          `Failed to load lessons for ${category.slug}:`,
          error
        );

        return [];
      }
    })
  );

  const lessons = lessonResponses
    .flat()
    .sort((a, b) => {
      const categoryOrderA =
        a.category?.order ?? 999;

      const categoryOrderB =
        b.category?.order ?? 999;

      if (
        categoryOrderA !== categoryOrderB
      ) {
        return (
          categoryOrderA -
          categoryOrderB
        );
      }

      return (
        (a.order ?? 0) -
        (b.order ?? 0)
      );
    });

  setProgress(progressData.progress || []);
  setAllLessons(lessons);
} catch (error) {
  console.error(
    "Failed to load learning progress:",
    error
  );

  setError(
    "Unable to load your learning progress. Please try again."
  );
} finally {
  setLoading(false);
}


}

useEffect(() => {
loadProgress();
}, []);

async function removeProgress(
progressId: string
) {
const confirmed = window.confirm(
"Remove this lesson from your learning progress?"
);


if (!confirmed) {
  return;
}

try {
  const response = await fetch(
    `/api/learning-progress?id=${encodeURIComponent(
      progressId
    )}`,
    {
      method: "DELETE",
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    alert(
      data.error ||
        "Unable to remove learning progress."
    );

    return;
  }

  setProgress((current) =>
    current.filter(
      (item) =>
        item.id !== progressId
    )
  );
} catch (error) {
  console.error(
    "Failed to remove learning progress:",
    error
  );

  alert(
    "Unable to remove learning progress. Please try again."
  );
}


}

const completedLessonIds = useMemo(
() =>
new Set(
progress.map(
(item) => item.lessonId
)
),
[progress]
);

const completedLessons = useMemo(
() =>
allLessons.filter((lesson) =>
completedLessonIds.has(lesson.id)
),
[allLessons, completedLessonIds]
);

const totalLessons = allLessons.length;

const completedCount =
completedLessons.length;

const remainingLessons = Math.max(
totalLessons - completedCount,
0
);

const progressPercentage =
totalLessons > 0
? Math.round(
(completedCount /
totalLessons) *
100
)
: 0;

const continueLesson = useMemo(
() =>
allLessons.find(
(lesson) =>
!completedLessonIds.has(
lesson.id
)
) || null,
[allLessons, completedLessonIds]
);

const latestCompleted =
useMemo(() => {
if (progress.length === 0) {
return null;
}


  return progress[0];
}, [progress]);


function getLessonUrl(
lesson: Lesson
) {
const categorySlug =
lesson.category?.slug;


if (!categorySlug) {
  return "/learn";
}

return `/learn/${encodeURIComponent(
  categorySlug
)}/${encodeURIComponent(
  lesson.slug
)}`;


}

function getCompletedLesson(
item: ProgressItem
) {
return allLessons.find(
(lesson) =>
lesson.id === item.lessonId
);
}

return ( <main className="min-h-screen bg-gray-50 text-gray-900"> <div className="mx-auto max-w-5xl px-6 py-10 sm:px-8">
{/* Header */} <section className="mb-8"> <a
         href="/account"
         className="text-sm font-medium text-gray-500 transition hover:text-gray-900"
       >
← Back to Account </a>


      <h1 className="mt-5 text-4xl font-bold text-gray-900">
        Learning Progress
      </h1>

      <p className="mt-3 max-w-2xl text-lg text-gray-600">
        Keep track of the lessons you have
        completed on HalalWise and continue
        your learning journey.
      </p>
    </section>

    {/* Loading */}
    {loading && (
      <section className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <div className="mb-3 text-3xl">
          🔄
        </div>

        <p className="text-gray-600">
          Loading your learning progress...
        </p>
      </section>
    )}

    {/* Error */}
    {!loading && error && (
      <section className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-3 text-3xl">
          ⚠️
        </div>

        <h2 className="font-semibold text-gray-900">
          Unable to load progress
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          {error}
        </p>

        <button
          type="button"
          onClick={loadProgress}
          className="mt-5 rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-black"
        >
          Try Again
        </button>
      </section>
    )}

    {/* Content */}
    {!loading &&
      !error && (
        <>
          {/* Main Progress Card */}
          <section className="mb-8 overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
            <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 p-6 text-white sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.2em] text-emerald-300">
                    YOUR LEARNING JOURNEY
                  </p>

                  <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                    Keep going!
                  </h2>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-100/80">
                    Every completed lesson brings
                    you one step further in your
                    learning journey.
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-4xl font-bold">
                    {progressPercentage}%
                  </p>

                  <p className="mt-1 text-sm text-emerald-100/80">
                    completed
                  </p>
                </div>
              </div>

              <div className="mt-7 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                  style={{
                    width: `${progressPercentage}%`,
                  }}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  {completedCount} of{" "}
                  {totalLessons} lessons
                  completed
                </span>

                <span>
                  {remainingLessons}{" "}
                  {remainingLessons === 1
                    ? "lesson"
                    : "lessons"}{" "}
                  remaining
                </span>
              </div>
            </div>
          </section>

          {/* Stats */}
          <section className="mb-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="text-3xl">
                📚
              </div>

              <p className="mt-4 text-sm text-gray-500">
                Completed Lessons
              </p>

              <p className="mt-1 text-3xl font-bold text-gray-900">
                {completedCount}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="text-3xl">
                📖
              </div>

              <p className="mt-4 text-sm text-gray-500">
                Lessons Remaining
              </p>

              <p className="mt-1 text-3xl font-bold text-gray-900">
                {remainingLessons}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="text-3xl">
                🕒
              </div>

              <p className="mt-4 text-sm text-gray-500">
                Latest Completion
              </p>

              <p className="mt-1 text-sm font-semibold text-gray-900">
                {latestCompleted
                  ? new Date(
                      latestCompleted.completedAt
                    ).toLocaleDateString(
                      "en-IN",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }
                    )
                  : "—"}
              </p>
            </div>
          </section>

          {/* Continue Learning */}
          {continueLesson && (
            <section className="mb-8 rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                    Continue Learning
                  </p>

                  <h2 className="mt-2 text-xl font-bold text-gray-900">
                    {continueLesson.title}
                  </h2>

                  {continueLesson.description && (
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                      {
                        continueLesson.description
                      }
                    </p>
                  )}

                  {continueLesson.category && (
                    <p className="mt-3 text-xs font-medium text-emerald-700">
                      {
                        continueLesson
                          .category
                          .name
                      }
                    </p>
                  )}
                </div>

                <a
                  href={getLessonUrl(
                    continueLesson
                  )}
                  className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
                >
                  Continue →
                </a>
              </div>
            </section>
          )}

          {/* All completed */}
          {!continueLesson &&
            totalLessons > 0 && (
              <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <div className="text-4xl">
                  🎉
                </div>

                <h2 className="mt-3 text-xl font-bold text-gray-900">
                  All lessons completed!
                </h2>

                <p className="mt-2 text-sm text-gray-600">
                  You have completed all
                  available Learn lessons.
                </p>
              </section>
            )}

          {/* Completed Lessons */}
          <section>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  Completed Lessons
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Lessons you have marked as
                  complete.
                </p>
              </div>

              <a
                href="/learn"
                className="inline-flex w-fit rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-gray-900 hover:bg-white"
              >
                Explore Lessons
              </a>
            </div>

            {progress.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
                <div className="mb-3 text-4xl">
                  📖
                </div>

                <h3 className="font-semibold text-gray-900">
                  No completed lessons yet
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Start learning and mark
                  lessons as complete to
                  track your progress here.
                </p>

                <a
                  href="/learn"
                  className="mt-5 inline-block rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-black"
                >
                  Start Learning →
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {progress.map((item) => {
                  const lesson =
                    getCompletedLesson(
                      item
                    );

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="mb-2 inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                            ✓ Completed
                          </div>

                          <h3 className="text-lg font-semibold text-gray-900">
                            {
                              item.lessonTitle
                            }
                          </h3>

                          {lesson?.category && (
                            <p className="mt-1 text-sm font-medium text-emerald-700">
                              {
                                lesson
                                  .category
                                  .name
                              }
                            </p>
                          )}

                          <p className="mt-2 text-sm text-gray-500">
                            Completed on{" "}
                            {new Date(
                              item.completedAt
                            ).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              }
                            )}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {lesson && (
                            <a
                              href={getLessonUrl(
                                lesson
                              )}
                              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-gray-900 hover:bg-gray-50"
                            >
                              View Lesson
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              removeProgress(
                                item.id
                              )
                            }
                            className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
  </div>
</main>


);
}
