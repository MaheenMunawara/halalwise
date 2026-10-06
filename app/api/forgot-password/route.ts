import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/users";
import {
  generateResetToken,
  getPasswordResetCollection,
  getResetTokenExpiry,
  hashResetToken,
} from "@/lib/passwordReset";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email =
      typeof body?.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: "Email is required.",
        },
        { status: 400 }
      );
    }

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    const users = await getUsersCollection();

    const user = await users.findOne(
      { email },
      {
        projection: {
          _id: 1,
        },
      }
    );

    /*
     * Do not reveal whether an email is registered.
     */
    if (!user) {
      return NextResponse.json({
        success: true,
        message:
          "If an account exists with this email, password reset instructions have been created.",
      });
    }

    const resetToken = generateResetToken();
    const tokenHash = hashResetToken(resetToken);
    const expiresAt = getResetTokenExpiry();

    const passwordResetTokens =
      await getPasswordResetCollection();

    await passwordResetTokens.deleteMany({
      userId: user._id,
    });

    await passwordResetTokens.insertOne({
      userId: user._id,
      tokenHash,
      expiresAt,
      createdAt: new Date(),
    });

    const baseUrl =
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";

    const resetUrl =
      `${baseUrl}/reset-password?token=${encodeURIComponent(
        resetToken
      )}`;

    console.log(
      "========================================"
    );

    console.log(
      "PASSWORD RESET URL:",
      resetUrl
    );

    console.log(
      "========================================"
    );

    return NextResponse.json({
      success: true,
      message:
        "If an account exists with this email, password reset instructions have been created.",
    });
  } catch (error) {
    console.error(
      "Password reset request failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to process the password reset request.",
      },
      { status: 500 }
    );
  }
}