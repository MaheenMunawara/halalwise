import { auth } from "@/auth";
import { getBookmarksCollection } from "@/lib/bookmarks";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const bookmarks = await getBookmarksCollection();

    const userId = session.user.email.toLowerCase();

    const results = await bookmarks
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      bookmarks: results.map((bookmark) => ({
        id: bookmark._id.toString(),
        contentType: bookmark.contentType,
        contentId: bookmark.contentId,
        title: bookmark.title,
        description: bookmark.description ?? "",
        url: bookmark.url,
        createdAt: bookmark.createdAt,
      })),
    });
  } catch (error) {
    console.error(
      "Failed to get bookmarks:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load bookmarks.",
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
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const contentType =
      typeof body?.contentType === "string"
        ? body.contentType.trim()
        : "";

    const contentId =
      typeof body?.contentId === "string"
        ? body.contentId.trim()
        : "";

    const title =
      typeof body?.title === "string"
        ? body.title.trim()
        : "";

    const description =
      typeof body?.description === "string"
        ? body.description.trim()
        : "";

    const url =
      typeof body?.url === "string"
        ? body.url.trim()
        : "";

    if (
      !contentType ||
      !contentId ||
      !title ||
      !url
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Content type, content ID, title, and URL are required.",
        },
        { status: 400 }
      );
    }

    if (contentType.length > 50) {
      return NextResponse.json(
        {
          success: false,
          message: "Content type is too long.",
        },
        { status: 400 }
      );
    }

    if (contentId.length > 200) {
      return NextResponse.json(
        {
          success: false,
          message: "Content ID is too long.",
        },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        {
          success: false,
          message: "Title is too long.",
        },
        { status: 400 }
      );
    }

    if (description.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          message: "Description is too long.",
        },
        { status: 400 }
      );
    }

    if (url.length > 500) {
      return NextResponse.json(
        {
          success: false,
          message: "URL is too long.",
        },
        { status: 400 }
      );
    }

    const bookmarks = await getBookmarksCollection();

    const userId = session.user.email.toLowerCase();

    const existingBookmark = await bookmarks.findOne({
      userId,
      contentType,
      contentId,
    });

    if (existingBookmark) {
      return NextResponse.json({
        success: true,
        message: "Bookmark already exists.",
        bookmark: {
          id: existingBookmark._id.toString(),
          contentType: existingBookmark.contentType,
          contentId: existingBookmark.contentId,
          title: existingBookmark.title,
          description:
            existingBookmark.description ?? "",
          url: existingBookmark.url,
          createdAt: existingBookmark.createdAt,
        },
      });
    }

    const now = new Date();

    const result = await bookmarks.insertOne({
      userId,
      contentType,
      contentId,
      title,
      description,
      url,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Bookmark added successfully.",
        bookmark: {
          id: result.insertedId.toString(),
          contentType,
          contentId,
          title,
          description,
          url,
          createdAt: now,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Failed to create bookmark:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to add bookmark.",
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
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const contentType =
      typeof body?.contentType === "string"
        ? body.contentType.trim()
        : "";

    const contentId =
      typeof body?.contentId === "string"
        ? body.contentId.trim()
        : "";

    if (!contentType || !contentId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Content type and content ID are required.",
        },
        { status: 400 }
      );
    }

    const bookmarks = await getBookmarksCollection();

    const userId = session.user.email.toLowerCase();

    const result = await bookmarks.deleteOne({
      userId,
      contentType,
      contentId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Bookmark not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Bookmark removed successfully.",
    });
  } catch (error) {
    console.error(
      "Failed to delete bookmark:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to remove bookmark.",
      },
      { status: 500 }
    );
  }
}