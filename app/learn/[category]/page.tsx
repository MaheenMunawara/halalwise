"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Lesson = {
id: string;
categoryId: string;
title: string;
slug: string;
description: string;
difficulty: "beginner" | "intermediate" | "advanced";
order: number;
estimatedMinutes: number;
};

type Category = {
id: string;
name: string;
slug: string;
description: string;
icon?: string;
};

export default function LearnCategoryPage() {
const params = useParams();

const categorySlug = params.category as string;

const [category, setCategory] =
useState<Category | null>(null);

const [lessons, setLessons] = useState<Lesson[]>([]);

const [loading, setLoading] = useState(true);

const [error, setError] = useState("");

useEffect(() => {
if (!categorySlug) {
return;
}


async function loadCategory() {
  try {
    setLoading(true);
    setError("");

    const response = await fetch(
      `/api/learn?slug=${encodeURIComponent(
        categorySlug
      )}`
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error ||
          "Failed to load the category."
      );
    }

    setCategory(data.category);
    setLessons(data.lessons || []);
  } catch (error) {
    console.error(
      "Learn category failed:",
      error
    );

    setError(
      "Unable to load this category right now."
    );
  } finally {
    setLoading(false);
  }
}

loadCategory();


}, [categorySlug]);

if (loading) {
return ( <main className="min-h-screen bg-white px-6 py-12 text-gray-900"> <div className="mx-auto max-w-5xl py-16 text-center"> <p className="text-gray-600">
Loading category... </p> </div> </main>
);
}

if (error || !category) {
return ( <main className="min-h-screen bg-white px-6 py-12 text-gray-900"> <div className="mx-auto max-w-3xl py-16 text-center"> <h1 className="text-2xl font-bold">
Category not found </h1>


      <p className="mt-3 text-gray-600">
        {error ||
          "This learning category does not exist."}
      </p>

      <Link
        href="/learn"
        className="mt-6 inline-block font-medium text-green-700 hover:text-green-800"
      >
        ← Back to Learn
      </Link>
    </div>
  </main>
);

}

return ( <main className="min-h-screen bg-white px-6 py-12 text-gray-900"> <div className="mx-auto max-w-5xl"> <nav className="mb-8 text-sm text-gray-500"> <Link
         href="/learn"
         className="hover:text-green-700"
       >
Learn </Link>


      <span className="mx-2">/</span>

      <span className="text-gray-700">
        {category.name}
      </span>
    </nav>

    <header className="mb-10">
      <div className="mb-5 flex items-center gap-3">
        <span className="text-4xl">
          {category.icon || "📚"}
        </span>

        <span className="text-sm font-semibold uppercase tracking-widest text-green-700">
          HalalWise Learn
        </span>
      </div>

      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        {category.name}
      </h1>

      <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-600">
        {category.description}
      </p>
    </header>

    {lessons.length === 0 ? (
      <section className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center">
        <div className="text-4xl">📚</div>

        <h2 className="mt-4 text-xl font-semibold">
          No lessons available yet
        </h2>

        <p className="mt-2 text-gray-600">
          New lessons will be added to this
          category soon.
        </p>
      </section>
    ) : (
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">
            Lessons
          </h2>

          <span className="text-sm text-gray-500">
            {lessons.length}{" "}
            {lessons.length === 1
              ? "lesson"
              : "lessons"}
          </span>
        </div>

        <div className="grid gap-5">
          {lessons.map((lesson, index) => (
            <Link
              key={lesson.id}
              href={`/learn/${category.slug}/${lesson.slug}`}
              className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-green-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-5">
                <div className="flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                      Lesson {index + 1}
                    </span>

                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs capitalize text-gray-600">
                      {lesson.difficulty}
                    </span>

                    <span className="text-xs text-gray-500">
                      {lesson.estimatedMinutes} min
                    </span>
                  </div>

                  <h3 className="text-xl font-semibold group-hover:text-green-700">
                    {lesson.title}
                  </h3>

                  <p className="mt-2 leading-7 text-gray-600">
                    {lesson.description}
                  </p>
                </div>

                <span className="mt-1 text-lg text-gray-400 transition group-hover:translate-x-1 group-hover:text-green-700">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    )}

    <div className="mt-10">
      <Link
        href="/learn"
        className="font-medium text-green-700 hover:text-green-800"
      >
        ← Back to all categories
      </Link>
    </div>
  </div>
</main>


);
}
