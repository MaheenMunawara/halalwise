import { NextResponse } from "next/server";
import { getPasswordResetCollection } from "@/lib/passwordReset";

export async function GET() {
  try {
    const tokens = await getPasswordResetCollection();

    await tokens.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }
    );

    await tokens.createIndex(
      { tokenHash: 1 },
      { unique: true }
    );

    return NextResponse.json({
      success: true,
      message: "Password reset indexes created successfully.",
    });
  } catch (error) {
    console.error("Password reset index setup failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create password reset indexes.",
      },
      { status: 500 }
    );
  }
}