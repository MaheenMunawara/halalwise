import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

export async function GET(request: Request) {
  const client = new MongoClient(uri);

  try {
    const { searchParams } = new URL(request.url);

    const lessonId = searchParams.get("lessonId")?.trim();

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

    await client.connect();

    const db = client.db("halalwise");

    const lesson = await db
      .collection("learn_lessons")
      .findOne(
        {
          id: lessonId,
          published: true,
        },
        {
          projection: {
            _id: 0,
            sourceIds: 1,
          },
        }
      );

    if (!lesson) {
      return NextResponse.json(
        {
          success: false,
          error: "Lesson not found.",
        },
        {
          status: 404,
        }
      );
    }

    const sourceIds = Array.isArray(lesson.sourceIds)
      ? lesson.sourceIds
      : [];

    if (sourceIds.length === 0) {
      return NextResponse.json({
        success: true,
        sources: [],
      });
    }

    const objectIds = sourceIds
      .filter((id: unknown) => typeof id === "string")
      .filter((id: string) => ObjectId.isValid(id))
      .map((id: string) => new ObjectId(id));

    const sources = await db
      .collection("sources")
      .find(
        {
          $or: [
            {
              id: {
                $in: sourceIds,
              },
            },
            {
              _id: {
                $in: objectIds,
              },
            },
          ],
          verified: true,
          verificationStatus: "verified",
        },
        {
          projection: {
            _id: 1,
            id: 1,
            sourceType: 1,
            sourceName: 1,
            sourceCategory: 1,
            reference: 1,
            authorityLevel: 1,
            authenticity: 1,
            madhhab: 1,
            methodology: 1,
            verified: 1,
            verifiedBy: 1,
            verifiedAt: 1,
            sourceUrl: 1,
            verificationStatus: 1,
          },
        }
      )
      .toArray();

    const formattedSources = sources.map((source) => ({
      id: source.id || source._id.toString(),
      sourceType: source.sourceType,
      sourceName: source.sourceName,
      sourceCategory: source.sourceCategory,
      reference: source.reference,
      authorityLevel: source.authorityLevel,
      authenticity: source.authenticity,
      madhhab: source.madhhab,
      methodology: source.methodology,
      verified: source.verified,
      verifiedBy: source.verifiedBy,
      verifiedAt: source.verifiedAt,
      sourceUrl: source.sourceUrl,
      verificationStatus: source.verificationStatus,
    }));

    return NextResponse.json({
      success: true,
      sources: formattedSources,
    });
  } catch (error) {
    console.error(
      "Learn lesson sources API failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Learn lesson sources API failed.",
      },
      {
        status: 500,
      }
    );
  } finally {
    await client.close();
  }
}