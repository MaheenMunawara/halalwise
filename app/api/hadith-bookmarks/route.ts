
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getHadithBookmarksCollection } from "@/lib/hadithBookmarks";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const userId = session.user.email.toLowerCase();

    const bookmarks =
      await getHadithBookmarksCollection();

    const savedHadith = await bookmarks
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      bookmarks: savedHadith,
    });
  } catch (error) {
    console.error(
      "Failed to get saved Hadith:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get saved Hadith.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const hadithId =
      typeof body?.hadithId === "string"
        ? body.hadithId.trim()
        : "";

    const title =
      typeof body?.title === "string"
        ? body.title.trim()
        : "";

    const text =
      typeof body?.text === "string"
        ? body.text.trim()
        : "";

    const source =
      typeof body?.source === "string"
        ? body.source.trim()
        : "";

    const sourceUrl =
      typeof body?.sourceUrl === "string"
        ? body.sourceUrl.trim()
        : "";

    if (!hadithId || !title || !text) {
      return NextResponse.json(
        {
          success: false,
          error: "Hadith information is incomplete.",
        },
        { status: 400 }
      );
    }

    const userId = session.user.email.toLowerCase();

    const bookmarks =
      await getHadithBookmarksCollection();

    const existing = await bookmarks.findOne({
      userId,
      hadithId,
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Hadith already saved.",
        },
        { status: 409 }
      );
    }

    const bookmark = {
      userId,
      hadithId,
      title,
      text,
      source,
      sourceUrl,
      createdAt: new Date(),
    };

    await bookmarks.insertOne(bookmark);

    return NextResponse.json({
      success: true,
      message: "Hadith saved successfully.",
    });
  } catch (error) {
    console.error(
      "Failed to save Hadith:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save Hadith.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const hadithId =
      typeof body?.hadithId === "string"
        ? body.hadithId.trim()
        : "";

    if (!hadithId) {
      return NextResponse.json(
        {
          success: false,
          error: "Hadith ID is required.",
        },
        { status: 400 }
      );
    }

    const userId = session.user.email.toLowerCase();

    const bookmarks =
      await getHadithBookmarksCollection();

    const result = await bookmarks.deleteOne({
      userId,
      hadithId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Saved Hadith not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Hadith removed successfully.",
    });
  } catch (error) {
    console.error(
      "Failed to remove saved Hadith:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to remove saved Hadith.",
      },
      { status: 500 }
    );
  }
}
