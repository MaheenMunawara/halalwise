"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!token) {
      setError(
        "This password reset link is invalid or incomplete."
      );
      return;
    }

    if (newPassword.length < 8) {
      setError(
        "New password must be at least 8 characters."
      );
      return;
    }

    if (newPassword.length > 100) {
      setError(
        "New password must be 100 characters or less."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data?.message ||
            "Unable to reset your password."
        );
        return;
      }

      router.push(
        "/login?passwordReset=true"
      );
    } catch {
      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-5 py-12">
        <div className="w-full max-w-md text-center">
          <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-2xl">
              ⚠️
            </div>

            <h1 className="text-2xl font-bold text-gray-900">
              Invalid reset link
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-600">
              This password reset link is missing its
              security token.
            </p>

            <Link
              href="/forgot-password"
              className="mt-6 inline-block font-semibold text-emerald-800 hover:underline"
            >
              Request a new reset link
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
            🔑
          </div>

          <p className="mb-2 text-sm font-medium tracking-wide text-emerald-700">
            PASSWORD RECOVERY
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Create a new password
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            Choose a new password for your HalalWise
            account.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="space-y-5">
            <div>
              <label
                htmlFor="new-password"
                className="mb-2 block text-sm font-medium text-gray-800"
              >
                New Password
              </label>

              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(event.target.value)
                }
                placeholder="At least 8 characters"
                autoComplete="new-password"
                minLength={8}
                maxLength={100}
                disabled={loading}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-gray-100"
              />

              <p className="mt-2 text-xs text-gray-500">
                Password must be 8–100 characters.
              </p>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block text-sm font-medium text-gray-800"
              >
                Confirm New Password
              </label>

              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                minLength={8}
                maxLength={100}
                disabled={loading}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-gray-100"
              />
            </div>

            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Resetting password..."
                : "Reset Password"}
            </button>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm font-semibold text-emerald-800 hover:underline"
            >
              ← Back to sign in
            </Link>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500">
          For your security, reset links expire after 15
          minutes.
        </p>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          Loading password reset...
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}