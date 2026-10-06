import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

export async function GET(request: Request) {
  const client = new MongoClient(uri);

  try {
    const { searchParams } = new URL(request.url);

    const categorySlug = searchParams.get("category")?.trim();
    const lessonSlug = searchParams.get("lesson")?.trim();

    if (!categorySlug || !lessonSlug) {
      return NextResponse.json(
        {
          success: false,
          error: "category and lesson are required.",
        },
        { status: 400 }
      );
    }

    await client.connect();

    const db = client.db("halalwise");

    const category = await db.collection("learn_categories").findOne(
      {
        slug: categorySlug,
        published: true,
      },
      {
        projection: {
          _id: 0,
          id: 1,
          name: 1,
          slug: 1,
          order: 1,
        },
      }
    );

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: "Category not found.",
        },
        { status: 404 }
      );
    }

    const currentLesson = await db.collection("learn_lessons").findOne(
      {
        categoryId: category.id,
        slug: lessonSlug,
        published: true,
      },
      {
        projection: {
          _id: 0,
          id: 1,
          categoryId: 1,
          title: 1,
          slug: 1,
          description: 1,
          difficulty: 1,
          order: 1,
          estimatedMinutes: 1,
        },
      }
    );

    if (!currentLesson) {
      return NextResponse.json(
        {
          success: false,
          error: "Lesson not found.",
        },
        { status: 404 }
      );
    }

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
            difficulty: 1,
            order: 1,
            estimatedMinutes: 1,
          },
        }
      )
      .toArray();

    const categoryMap = new Map(
      categories.map((item) => [item.id, item])
    );

    const orderedLessons = lessons.sort((a, b) => {
      const categoryA = categoryMap.get(a.categoryId);
      const categoryB = categoryMap.get(b.categoryId);

      const categoryOrderA = categoryA?.order ?? 9999;
      const categoryOrderB = categoryB?.order ?? 9999;

      if (categoryOrderA !== categoryOrderB) {
        return categoryOrderA - categoryOrderB;
      }

      if (a.order !== b.order) {
        return a.order - b.order;
      }

      return a.title.localeCompare(b.title);
    });

    const currentIndex = orderedLessons.findIndex(
      (lesson) => lesson.id === currentLesson.id
    );

    if (currentIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: "Current lesson is not in the learning sequence.",
        },
        { status: 404 }
      );
    }

    const previousLesson =
      currentIndex > 0
        ? orderedLessons[currentIndex - 1]
        : null;

    const nextLesson =
      currentIndex < orderedLessons.length - 1
        ? orderedLessons[currentIndex + 1]
        : null;

    const formatLesson = (lesson: typeof currentLesson | null) => {
      if (!lesson) {
        return null;
      }

      const lessonCategory = categoryMap.get(lesson.categoryId);

      return {
        id: lesson.id,
        title: lesson.title,
        slug: lesson.slug,
        description: lesson.description,
        difficulty: lesson.difficulty,
        order: lesson.order,
        estimatedMinutes: lesson.estimatedMinutes,
        category: lessonCategory
          ? {
              id: lessonCategory.id,
              name: lessonCategory.name,
              slug: lessonCategory.slug,
            }
          : null,
      };
    };

    return NextResponse.json({
      success: true,
      currentLesson: {
        id: currentLesson.id,
        title: currentLesson.title,
        slug: currentLesson.slug,
        order: currentLesson.order,
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
        },
      },
      previousLesson: formatLesson(previousLesson),
      nextLesson: formatLesson(nextLesson),
    });
  } catch (error) {
    console.error("Lesson navigation API failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve lesson navigation.",
      },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}