import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

const lessons = [
  {
    id: "what-is-quran",
    categoryId: "quran",
    title: "What is the Qur'an?",
    slug: "what-is-quran",
    description:
      "Learn what the Qur'an is and why it is central to the life of a Muslim.",
    content:
      "The Qur'an is the Book of Allah revealed to Prophet Muhammad (peace be upon him). Muslims believe it is the final revelation from Allah and guidance for humanity.",
    difficulty: "beginner",
    order: 1,
    estimatedMinutes: 5,
    sourceIds: [],
    relatedLessonIds: [],
    published: true,
  },
  {
    id: "what-is-hadith",
    categoryId: "hadith",
    title: "What is Hadith?",
    slug: "what-is-hadith",
    description:
      "Learn what Hadith means and why Hadith is important in Islam.",
    content:
      "Hadith refers to reports about the words, actions, approvals, and characteristics of Prophet Muhammad (peace be upon him). Hadith helps Muslims understand the Sunnah and apply Islamic guidance.",
    difficulty: "beginner",
    order: 1,
    estimatedMinutes: 5,
    sourceIds: [],
    relatedLessonIds: [],
    published: true,
  },
  {
    id: "what-is-salah",
    categoryId: "salah",
    title: "Why is Salah Important?",
    slug: "why-is-salah-important",
    description:
      "Learn why Salah holds an important place in the life of a Muslim.",
    content:
      "Salah is the prescribed prayer performed by Muslims. It is one of the major acts of worship in Islam and provides a regular connection between a Muslim and Allah.",
    difficulty: "beginner",
    order: 1,
    estimatedMinutes: 5,
    sourceIds: [],
    relatedLessonIds: [],
    published: true,
  },
  {
    id: "what-is-riba",
    categoryId: "islamic-finance",
    title: "What is Riba?",
    slug: "what-is-riba",
    description:
      "Learn the basic meaning of Riba and why it is an important concept in Islamic finance.",
    content:
      "Riba is a prohibited form of increase discussed in Islamic sources. Understanding Riba is an important starting point for learning about Islamic finance.",
    difficulty: "beginner",
    order: 1,
    estimatedMinutes: 6,
    sourceIds: [],
    relatedLessonIds: [],
    published: true,
  },
];

export async function GET() {
  const client = new MongoClient(uri);

  try {
    await client.connect();

    const db = client.db("halalwise");

    const collection = db.collection("learn_lessons");

    const now = new Date();

    for (const lesson of lessons) {
      await collection.updateOne(
        {
          id: lesson.id,
        },
        {
          $set: {
            ...lesson,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        {
          upsert: true,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Learn lessons seeded successfully.",
      count: lessons.length,
      lessons: lessons.map((lesson) => ({
        id: lesson.id,
        categoryId: lesson.categoryId,
        title: lesson.title,
        slug: lesson.slug,
      })),
    });
  } catch (error) {
    console.error(
      "Learn lesson seeding failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Learn lesson seeding failed.",
      },
      {
        status: 500,
      }
    );
  } finally {
    await client.close();
  }
}