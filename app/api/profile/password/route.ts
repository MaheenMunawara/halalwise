import { auth } from "@/auth";
import { getUsersCollection } from "@/lib/users";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const currentPassword =
      typeof body?.currentPassword === "string"
        ? body.currentPassword
        : "";

    const newPassword =
      typeof body?.newPassword === "string"
        ? body.newPassword
        : "";

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (newPassword.length > 100) {
      return NextResponse.json(
        { error: "New password is too long." },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "New password must be different from your current password." },
        { status: 400 }
      );
    }

    const users = await getUsersCollection();

    const user = await users.findOne({
      email: session.user.email.toLowerCase(),
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );

    if (!passwordMatches) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await users.updateOne(
      { email: session.user.email.toLowerCase() },
      {
        $set: {
          passwordHash,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}