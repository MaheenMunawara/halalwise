import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/users";

export async function GET() {
  try {
    const users = await getUsersCollection();

    await users.createIndex(
      { email: 1 },
      {
        unique: true,
        name: "email_unique",
      }
    );

    await users.createIndex(
      { createdAt: -1 },
      {
        name: "created_at_index",
      }
    );

    return NextResponse.json({
      success: true,
      message: "User indexes created successfully.",
    });
  } catch (error) {
    console.error("User index setup failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "User index setup failed.",
      },
      { status: 500 }
    );
  }
}