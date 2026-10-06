"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type EditProfileFormProps = {
  currentName: string;
};

export default function EditProfileForm({
  currentName,
}: EditProfileFormProps) {
  const router = useRouter();

  const [name, setName] = useState(currentName);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setError("");

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Unable to update your profile.");
        return;
      }

      setName(data.user?.name || trimmedName);
      setMessage("Profile updated successfully.");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 border-t border-slate-800 pt-6">
      <h3 className="text-lg font-semibold">
        Edit Profile
      </h3>

      <p className="mt-1 text-sm text-slate-400">
        Update the name displayed on your HalalWise account.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-5 space-y-4"
      >
        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Name
          </label>

          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={50}
            disabled={loading}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Enter your name"
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
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}