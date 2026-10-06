import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getBookmarksCollection } from "@/lib/bookmarks";
import Link from "next/link";

export default async function BookmarksPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const bookmarks = await getBookmarksCollection();

  const userId = session.user.email.toLowerCase();

  const savedBookmarks = await bookmarks
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link
            href="/account"
            className="text-sm text-emerald-400 hover:underline"
          >
            ← Back to Account
          </Link>

          <h1 className="mt-4 text-3xl font-bold">
            My Bookmarks
          </h1>

          <p className="mt-2 text-slate-400">
            Content you've saved on HalalWise.
          </p>
        </div>

        {savedBookmarks.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <div className="text-4xl">🔖</div>

            <h2 className="mt-4 text-xl font-semibold">
              No bookmarks yet
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              When you save useful Qur'an, Hadith,
              Finance, or Learn content, it will appear
              here.
            </p>

            <Link
              href="/learn"
              className="mt-6 inline-block rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Explore Learn
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {savedBookmarks.map((bookmark) => (
              <article
                key={bookmark._id.toString()}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                      {bookmark.contentType}
                    </p>

                    <h2 className="mt-2 text-xl font-semibold">
                      {bookmark.title}
                    </h2>

                    {bookmark.description && (
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        {bookmark.description}
                      </p>
                    )}
                  </div>

                  <Link
                    href={bookmark.url}
                    className="w-fit rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-950"
                  >
                    Open
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}