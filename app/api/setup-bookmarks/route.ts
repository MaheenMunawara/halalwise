import { NextResponse } from "next/server";
import { getBookmarksCollection } from "@/lib/bookmarks";

export async function GET() {
  try {
    const bookmarks = await getBookmarksCollection();

    await bookmarks.createIndex(
      {
        userId: 1,
        contentType: 1,
        contentId: 1,
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
      message: "Bookmark indexes created successfully.",
    });
  } catch (error) {
    console.error(
      "Bookmark index setup failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create bookmark indexes.",
      },
      { status: 500 }
    );
  }
}