import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("halalwise");

    const result = await db.collection("quran").updateOne(
      {
        surahNumber: 2,
        ayahNumber: 275,
      },
      {
        $set: {
          arabicText:
            "ٱلَّذِينَ يَأۡكُلُونَ ٱلرِّبَوٰاْ لَا يَقُومُونَ إِلَّا كَمَا يَقُومُ ٱلَّذِي يَتَخَبَّطُهُ ٱلشَّيۡطَٰنُ مِنَ ٱلۡمَسِّۚ ذَٰلِكَ بِأَنَّهُمۡ قَالُواْ إِنَّمَا ٱلۡبَيۡعُ مِثۡلُ ٱلرِّبَوٰاْۗ وَأَحَلَّ ٱللَّهُ ٱلۡبَيۡعَ وَحَرَّمَ ٱلرِّبَوٰاْۚ فَمَن جَآءَهُۥ مَوۡعِظَةٞ مِّن رَّبِّهِۦ فَٱنتَهَىٰ فَلَهُۥ مَا سَلَفَ وَأَمۡرُهُۥٓ إِلَى ٱللَّهِۖ وَمَنۡ عَادَ فَأُوْلَٰٓئِكَ أَصۡحَٰبُ ٱلنَّارِۖ هُمۡ فِيهَا خَٰلِدُونَ",

          arabicTextSource: "Tanzil Project",
          arabicTextVersion: "Uthmani",
          arabicTextSourceUrl: "https://tanzil.net",

          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Verified Arabic Qur'an text added successfully 🕌",
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update Qur'an text",
      },
      { status: 500 }
    );
  }
}