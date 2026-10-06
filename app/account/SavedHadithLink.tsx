
import Link from "next/link";

export default function SavedHadithLink() {
  return (
    <Link
      href="/account/saved-hadith"
      className="block rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-emerald-500 hover:bg-slate-800"
    >
      <div className="text-3xl">📖</div>

      <h2 className="mt-4 text-lg font-semibold text-slate-100">
        Saved Hadith
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-400">
        View the Hadith you have saved from the Islamic Assistant.
      </p>

      <span className="mt-4 inline-block text-sm font-medium text-emerald-400">
        View saved Hadith →
      </span>
    </Link>
  );
}
