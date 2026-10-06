"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800"
    >
      Logout
    </button>
  );
}