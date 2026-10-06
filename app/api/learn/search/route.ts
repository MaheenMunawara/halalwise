import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(request: Request) {
  const client = new MongoClient(uri);

  try {
    const { searchParams } = new URL(request.url);

    const query = searchParams.get("q")?.trim() || "";

    if (!query) {
      return NextResponse.json({
        success: true,
        query: "",
        count: 0,
        lessons: [],
      });
    }

    await client.connect();

    const db = client.db("halalwise");

    const lessons = await db
      .collection("learn_lessons")
      .find(
        { published: true },
        {
          projection: {
            _id: 0,
            id: 1,
            categoryId: 1,
            title: 1,
            slug: 1,
            description: 1,
            content: 1,
            difficulty: 1,
            order: 1,
            estimatedMinutes: 1,
          },
        }
      )
      .toArray();

    const categories = await db
      .collection("learn_categories")
      .find(
        { published: true },
        {
          projection: {
            _id: 0,
            id: 1,
            name: 1,
            slug: 1,
            order: 1,
          },
        }
      )
      .sort({ order: 1 })
      .toArray();

    const categoryMap = new Map(
      categories.map((category) => [category.id, category])
    );

    const normalizedQuery = normalizeText(query);

    const rankedLessons = lessons
      .map((lesson) => {
        const category = categoryMap.get(lesson.categoryId);

        const title = normalizeText(lesson.title || "");
        const description = normalizeText(
          lesson.description || ""
        );
        const content = normalizeText(
          lesson.content || ""
        );
        const categoryName = normalizeText(
          category?.name || ""
        );

        let score = 0;

        if (title === normalizedQuery) {
          score += 100;
        }

        if (title.startsWith(normalizedQuery)) {
          score += 50;
        }

        if (title.includes(normalizedQuery)) {
          score += 30;
        }

        if (categoryName === normalizedQuery) {
          score += 25;
        }

        if (categoryName.includes(normalizedQuery)) {
          score += 15;
        }

        if (description.includes(normalizedQuery)) {
          score += 10;
        }

        if (content.includes(normalizedQuery)) {
          score += 5;
        }

        return {
          lesson,
          category,
          score,
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        const categoryOrderA =
          a.category?.order ?? 9999;

        const categoryOrderB =
          b.category?.order ?? 9999;

        if (categoryOrderA !== categoryOrderB) {
          return categoryOrderA - categoryOrderB;
        }

        if (a.lesson.order !== b.lesson.order) {
          return a.lesson.order - b.lesson.order;
        }

        return a.lesson.title.localeCompare(
          b.lesson.title
        );
      });

    const formattedLessons = rankedLessons.map(
      ({ lesson, category }) => ({
        id: lesson.id,
        categoryId: lesson.categoryId,
        title: lesson.title,
        slug: lesson.slug,
        description: lesson.description,
        difficulty: lesson.difficulty,
        order: lesson.order,
        estimatedMinutes: lesson.estimatedMinutes,
        category: category
          ? {
              id: category.id,
              name: category.name,
              slug: category.slug,
            }
          : null,
      })
    );

    return NextResponse.json({
      success: true,
      query,
      count: formattedLessons.length,
      lessons: formattedLessons,
    });
  } catch (error) {
    console.error("Learn search API failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to search Learn lessons.",
      },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}