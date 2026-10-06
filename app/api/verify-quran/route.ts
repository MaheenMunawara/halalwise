import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("halalwise");

    const quran = await db
      .collection("quran")
      .find({})
      .toArray();

    return NextResponse.json({
      success: true,
      count: quran.length,
      records: quran,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to verify Qur'an records",
      },
      { status: 500 }
    );
  }
}