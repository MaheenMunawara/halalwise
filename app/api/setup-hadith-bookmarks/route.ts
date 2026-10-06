import { NextResponse } from "next/server";
import { getHadithBookmarksCollection } from "@/lib/hadithBookmarks";

export async function GET() {
  try {
    const bookmarks =
      await getHadithBookmarksCollection();

    await bookmarks.createIndex(
      { userId: 1, hadithId: 1 },
      { unique: true }
    );

    await bookmarks.createIndex({
      userId: 1,
      createdAt: -1,
    });

    return NextResponse.json({
      success: true,
      message:
        "Hadith bookmark indexes created successfully.",
    });
  } catch (error) {
    console.error(
      "Failed to create Hadith bookmark indexes:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to create Hadith bookmark indexes.",
      },
      { status: 500 }
    );
  }
}