
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { auth } from "@/auth";

const uri =
  process.env.MONGODB_URI ??
  (() => {
    throw new Error("MONGODB_URI is not defined");
  })();

export async function GET() {
  const session = await auth();

  console.log("========== FINANCE AUTH DEBUG ==========");
  console.log("Session email:", session?.user?.email);
  console.log("Session role:", session?.user?.role);

  if (!session?.user?.email) {
    console.log("No logged-in user found.");
    console.log("========================================");

    return NextResponse.json(
      {
        success: false,
        error: "You must be logged in.",
      },
      { status: 401 }
    );
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();

    const db = client.db("halalwise");

    const databaseUser = await db
      .collection("users")
      .findOne(
        {
          email: session.user.email.toLowerCase(),
        },
        {
          projection: {
            _id: 0,
            email: 1,
            role: 1,
          },
        }
      );

    console.log("MongoDB user:", databaseUser);
    console.log("MongoDB role:", databaseUser?.role);
    console.log("========================================");

    if (session.user.role !== "finance_reviewer") {
      return NextResponse.json(
        {
          success: false,
          error:
            "You are not authorized to view finance verification records.",
        },
        { status: 403 }
      );
    }

    const companies = await db
      .collection("finance_companies")
      .find(
        {},
        {
          projection: {
            _id: 0,
          },
        }
      )
      .sort({
        companyName: 1,
      })
      .toArray();

    return NextResponse.json({
      success: true,
      companies,
    });
  } catch (error) {
    console.error(
      "Finance companies lookup failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to load finance verification records.",
      },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}
