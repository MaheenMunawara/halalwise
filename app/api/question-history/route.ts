import { auth } from "@/auth";
import { getQuestionHistoryCollection } from "@/lib/questionHistory";
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

    const history = await getQuestionHistoryCollection();

    const userId = session.user.email.toLowerCase();

    const results = await history
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      history: results.map((item) => ({
        id: item._id.toString(),
        question: item.question,
        answer: item.answer,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    console.error(
      "Failed to get question history:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load question history.",
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

    const question =
      typeof body?.question === "string"
        ? body.question.trim()
        : "";

    const answer =
      typeof body?.answer === "string"
        ? body.answer.trim()
        : "";

    if (!question || !answer) {
      return NextResponse.json(
        {
          success: false,
          message: "Question and answer are required.",
        },
        { status: 400 }
      );
    }

    if (question.length > 2000) {
      return NextResponse.json(
        {
          success: false,
          message: "Question is too long.",
        },
        { status: 400 }
      );
    }

    if (answer.length > 20000) {
      return NextResponse.json(
        {
          success: false,
          message: "Answer is too long.",
        },
        { status: 400 }
      );
    }

    const history = await getQuestionHistoryCollection();

    const userId = session.user.email.toLowerCase();

    const now = new Date();

    const result = await history.insertOne({
      userId,
      question,
      answer,
      createdAt: now,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Question saved successfully.",
        history: {
          id: result.insertedId.toString(),
          question,
          answer,
          createdAt: now,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Failed to save question history:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to save question history.",
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

    const id =
      typeof body?.id === "string"
        ? body.id.trim()
        : "";

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "History ID is required.",
        },
        { status: 400 }
      );
    }

    const { ObjectId } = await import("mongodb");

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid history ID.",
        },
        { status: 400 }
      );
    }

    const history = await getQuestionHistoryCollection();

    const userId = session.user.email.toLowerCase();

    const result = await history.deleteOne({
      _id: new ObjectId(id),
      userId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Question history not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Question history deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Failed to delete question history:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to delete question history.",
      },
      { status: 500 }
    );
  }
}