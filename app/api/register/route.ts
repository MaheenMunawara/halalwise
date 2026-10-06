import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUsersCollection } from "@/lib/users";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid request body.",
      },
      { status: 400 }
    );
  }

  try {
    const data =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>)
        : {};

    const name =
      typeof data.name === "string"
        ? data.name.trim()
        : "";

    const email =
      typeof data.email === "string"
        ? data.email.trim().toLowerCase()
        : "";

    const password =
      typeof data.password === "string"
        ? data.password
        : "";

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Name, email, and password are required.",
        },
        { status: 400 }
      );
    }

    if (name.length < 2 || name.length > 50) {
      return NextResponse.json(
        {
          success: false,
          message: "Name must be between 2 and 50 characters.",
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

    if (password.length < 8 || password.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be between 8 and 100 characters.",
        },
        { status: 400 }
      );
    }

    const users = await getUsersCollection();

    const existingUser = await users.findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "An account with this email already exists.",
        },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date();

    const result = await users.insertOne({
      name,
      email,
      passwordHash,
      image: null,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully.",
        user: {
          id: result.insertedId.toString(),
          name,
          email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "An account with this email already exists.",
        },
        { status: 409 }
      );
    }

    console.error("Registration failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Registration failed. Please try again.",
      },
      { status: 500 }
    );
  }
}