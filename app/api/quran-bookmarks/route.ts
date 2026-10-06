
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getQuranBookmarksCollection } from "@/lib/quranBookmarks";

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
      await getQuranBookmarksCollection();

    const savedQuran = await bookmarks
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      bookmarks: savedQuran,
    });
  } catch (error) {
    console.error(
      "Failed to get saved Qur'an verses:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get saved Qur'an verses.",
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

    const verseId =
      typeof body?.verseId === "string"
        ? body.verseId.trim()
        : "";

    const reference =
      typeof body?.reference === "string"
        ? body.reference.trim()
        : "";

    const text =
      typeof body?.text === "string"
        ? body.text.trim()
        : "";

    const surah =
      typeof body?.surah === "string"
        ? body.surah.trim()
        : "";

    const source =
      typeof body?.source === "string"
        ? body.source.trim()
        : "";

    const sourceUrl =
      typeof body?.sourceUrl === "string"
        ? body.sourceUrl.trim()
        : "";

    if (!verseId || !reference || !text) {
      return NextResponse.json(
        {
          success: false,
          error: "Qur'an verse information is incomplete.",
        },
        { status: 400 }
      );
    }

    const userId = session.user.email.toLowerCase();

    const bookmarks =
      await getQuranBookmarksCollection();

    const existing = await bookmarks.findOne({
      userId,
      verseId,
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Qur'an verse already saved.",
        },
        { status: 409 }
      );
    }

    const bookmark = {
      userId,
      verseId,
      reference,
      text,
      surah,
      source,
      sourceUrl,
      createdAt: new Date(),
    };

    await bookmarks.insertOne(bookmark);

    return NextResponse.json({
      success: true,
      message: "Qur'an verse saved successfully.",
    });
  } catch (error) {
    console.error(
      "Failed to save Qur'an verse:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save Qur'an verse.",
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

    const verseId =
      typeof body?.verseId === "string"
        ? body.verseId.trim()
        : "";

    if (!verseId) {
      return NextResponse.json(
        {
          success: false,
          error: "Verse ID is required.",
        },
        { status: 400 }
      );
    }

    const userId = session.user.email.toLowerCase();

    const bookmarks =
      await getQuranBookmarksCollection();

    const result = await bookmarks.deleteOne({
      userId,
      verseId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Saved Qur'an verse not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Qur'an verse removed successfully.",
    });
  } catch (error) {
    console.error(
      "Failed to remove Qur'an verse:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to remove Qur'an verse.",
      },
      { status: 500 }
    );
  }
}
