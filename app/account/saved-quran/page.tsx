
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getQuranBookmarksCollection } from "@/lib/quranBookmarks";
import SavedQuranList from "./SavedQuranList";

export default async function SavedQuranPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const userId = session.user.email.toLowerCase();

  const bookmarks =
    await getQuranBookmarksCollection();

  const savedQuran = await bookmarks
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();

  const quranData = savedQuran.map((verse) => ({
    _id: verse._id.toString(),
    verseId: verse.verseId,
    reference: verse.reference,
    text: verse.text,
    surah: verse.surah || "",
    source: verse.source || "",
    sourceUrl: verse.sourceUrl || "",
    createdAt:
      verse.createdAt instanceof Date
        ? verse.createdAt.toISOString()
        : String(verse.createdAt || ""),
  }));

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/account"
          className="text-sm text-slate-400 transition hover:text-emerald-400"
        >
          ← Back to Account
        </Link>

        <h1 className="mt-6 text-3xl font-bold">
          Saved Qur'an
        </h1>

        <p className="mt-2 text-slate-400">
          Qur'an verses you have saved for later.
        </p>

        <SavedQuranList quran={quranData} />
      </div>
    </main>
  );
}
