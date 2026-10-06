import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/users";
import {
  getPasswordResetCollection,
  hashResetToken,
} from "@/lib/passwordReset";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const token =
      typeof body?.token === "string"
        ? body.token.trim()
        : "";

    const newPassword =
      typeof body?.newPassword === "string"
        ? body.newPassword
        : "";

    if (!token || !newPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Reset token and new password are required.",
        },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: "New password must be at least 8 characters.",
        },
        { status: 400 }
      );
    }

    if (newPassword.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: "New password must be 100 characters or less.",
        },
        { status: 400 }
      );
    }

    const tokenHash = hashResetToken(token);

    const passwordResetTokens =
      await getPasswordResetCollection();

    const resetRecord = await passwordResetTokens.findOne({
      tokenHash,
      expiresAt: {
        $gt: new Date(),
      },
    });

    if (!resetRecord) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This password reset link is invalid or has expired.",
        },
        { status: 400 }
      );
    }

    const users = await getUsersCollection();

    const user = await users.findOne({
      _id: resetRecord.userId,
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to reset the password for this account.",
        },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(
      newPassword,
      12
    );

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash,
          updatedAt: new Date(),
        },
      }
    );

    await passwordResetTokens.deleteOne({
      _id: resetRecord._id,
    });

    return NextResponse.json({
      success: true,
      message:
        "Password reset successfully. You can now sign in.",
    });
  } catch (error) {
    console.error(
      "Password reset failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to reset your password. Please try again.",
      },
      { status: 500 }
    );
  }
}