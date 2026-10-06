"use client";

import { FormEvent, useState } from "react";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setError(
        "Your new password must be different from your current password."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Unable to change your password.");
        return;
      }

      setMessage("Password changed successfully.");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 border-t border-slate-800 pt-6">
      <h3 className="text-lg font-semibold">
        Change Password
      </h3>

      <p className="mt-1 text-sm leading-6 text-slate-400">
        Use a strong password that you do not use on other websites.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-5 space-y-4"
      >
        <div>
          <label
            htmlFor="current-password"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Current Password
          </label>

          <input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(event) =>
              setCurrentPassword(event.target.value)
            }
            autoComplete="current-password"
            disabled={loading}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Enter your current password"
          />
        </div>

        <div>
          <label
            htmlFor="new-password"
            className="mb-2 block text-sm font-medium text-slate-300"
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
            autoComplete="new-password"
            minLength={8}
            maxLength={100}
            disabled={loading}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Enter your new password"
          />

          <p className="mt-2 text-xs text-slate-500">
            Minimum 8 characters.
          </p>
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="mb-2 block text-sm font-medium text-slate-300"
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
            autoComplete="new-password"
            minLength={8}
            maxLength={100}
            disabled={loading}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Re-enter your new password"
          />
        </div>

        {message && (
          <p className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-400">
            {message}
          </p>
        )}

        {error && (
          <p className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {loading ? "Changing Password..." : "Change Password"}
        </button>
      </form>
    </div>
  );
}