
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ObjectId } from "mongodb";
import {
  getLearningProgressCollection,
} from "@/lib/learningProgress";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const userId = session.user.email.toLowerCase();

    const collection =
      await getLearningProgressCollection();

    const progress = await collection
      .find({ userId })
      .sort({ completedAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      progress: progress.map((item) => ({
        id: item._id?.toString(),
        lessonId: item.lessonId,
        lessonTitle: item.lessonTitle,
        completedAt: item.completedAt,
      })),
    });
  } catch (error) {
    console.error(
      "GET /api/learning-progress error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load learning progress.",
      },
      {
        status: 500,
      }
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
        {
          status: 401,
        }
      );
    }

    const body = await request.json();

    const lessonId =
      typeof body.lessonId === "string"
        ? body.lessonId.trim()
        : "";

    const lessonTitle =
      typeof body.lessonTitle === "string"
        ? body.lessonTitle.trim()
        : "";

    if (!lessonId) {
      return NextResponse.json(
        {
          success: false,
          error: "Lesson ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!lessonTitle) {
      return NextResponse.json(
        {
          success: false,
          error: "Lesson title is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (lessonId.length > 200) {
      return NextResponse.json(
        {
          success: false,
          error: "Lesson ID is too long.",
        },
        {
          status: 400,
        }
      );
    }

    if (lessonTitle.length > 300) {
      return NextResponse.json(
        {
          success: false,
          error: "Lesson title is too long.",
        },
        {
          status: 400,
        }
      );
    }

    const userId = session.user.email.toLowerCase();

    const collection =
      await getLearningProgressCollection();

    const existing = await collection.findOne({
      userId,
      lessonId,
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        progress: {
          id: existing._id?.toString(),
          lessonId: existing.lessonId,
          lessonTitle: existing.lessonTitle,
          completedAt: existing.completedAt,
        },
      });
    }

    const completedAt = new Date();

    const result = await collection.insertOne({
      userId,
      lessonId,
      lessonTitle,
      completedAt,
    });

    return NextResponse.json(
      {
        success: true,
        alreadyCompleted: false,
        progress: {
          id: result.insertedId.toString(),
          lessonId,
          lessonTitle,
          completedAt,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/learning-progress error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save learning progress.",
      },
      {
        status: 500,
      }
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
        {
          status: 401,
        }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const id = searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid progress ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const userId = session.user.email.toLowerCase();

    const collection =
      await getLearningProgressCollection();

    const result = await collection.deleteOne({
      _id: new ObjectId(id),
      userId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Learning progress not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Learning progress removed.",
    });
  } catch (error) {
    console.error(
      "DELETE /api/learning-progress error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to remove learning progress.",
      },
      {
        status: 500,
      }
    );
  }
}
