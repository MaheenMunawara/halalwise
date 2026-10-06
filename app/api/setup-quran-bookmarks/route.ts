
import { NextResponse } from "next/server";
import { getQuranBookmarksCollection } from "@/lib/quranBookmarks";

export async function GET() {
  try {
    const bookmarks =
      await getQuranBookmarksCollection();

    await bookmarks.createIndex(
      {
        userId: 1,
        verseId: 1,
      },
      {
        unique: true,
      }
    );

    await bookmarks.createIndex({
      userId: 1,
      createdAt: -1,
    });

    return NextResponse.json({
      success: true,
      message:
        "Qur'an bookmark indexes created successfully.",
    });
  } catch (error) {
    console.error(
      "Failed to create Qur'an bookmark indexes:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to create Qur'an bookmark indexes.",
      },
      { status: 500 }
    );
  }
}
