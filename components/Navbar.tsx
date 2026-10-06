
import Link from "next/link";
import { auth } from "@/auth";
import LogoutButton from "@/components/LogoutButton";
export default async function Navbar() {
  const session = await auth();

  return (
    <nav className="flex flex-col gap-5 border-b border-slate-800 px-8 py-5 md:flex-row md:items-center md:justify-between">
      <Link href="/" className="text-2xl font-bold">
        HalalWise 🕌
      </Link>

      <div className="flex flex-wrap gap-6 text-sm">
        <Link href="/" className="hover:text-emerald-400">
          Home
        </Link>

        <Link href="/assistant" className="hover:text-emerald-400">
          Islamic Assistant
        </Link>

        <Link href="/finance" className="hover:text-emerald-400">
          Halal Finance
        </Link>

        <Link href="/learn" className="hover:text-emerald-400">
          Learn
        </Link>
      </div>

      {session?.user ? (
  <div className="flex items-center gap-3">
    <Link
      href="/account"
      className="w-fit rounded-lg bg-white px-4 py-2 text-slate-900"
    >
      My Account
    </Link>

    <LogoutButton />
  </div>
) : (
  <Link
    href="/login"
    className="w-fit rounded-lg bg-white px-4 py-2 text-slate-900"
  >
    Login
  </Link>
)}
    </nav>
  );
}