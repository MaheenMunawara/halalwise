
import SavedHadithLink from "./SavedHadithLink";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUsersCollection } from "@/lib/users";
import LogoutButton from "@/components/LogoutButton";
import EditProfileForm from "./EditProfileForm";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function AccountPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const users = await getUsersCollection();

  const user = await users.findOne(
    { email: session.user.email },
    {
      projection: {
        name: 1,
        email: 1,
        createdAt: 1,
      },
    }
  );

  if (!user) {
    redirect("/login");
  }

  const createdDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Not available";

  const displayName = user.name || "User";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-8 sm:mb-10">
          <a
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-emerald-400"
          >
            <span aria-hidden="true">←</span>
            Back to Home
          </a>

          <div className="rounded-3xl border border-emerald-900/60 bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-900 p-5 sm:p-8">
            <p className="text-xs font-semibold tracking-[0.2em] text-emerald-400">
              MY ACCOUNT
            </p>

            <div className="mt-5 flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-800 text-xl font-bold text-white shadow-lg shadow-emerald-950/40 sm:h-16 sm:w-16 sm:text-2xl">
                {initial}
              </div>

              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
                  Welcome, {displayName}!
                </h1>

                <p className="mt-2 text-sm text-slate-300">
                  Your personal HalalWise space.
                </p>
              </div>
            </div>

            <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              Manage your profile, keep your account secure, and continue
              exploring Islamic knowledge and halal finance.
            </p>
          </div>
        </div>

        <section
          aria-labelledby="profile-heading"
          className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10 sm:p-7"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-950 text-xl">
              👤
            </div>

            <div>
              <h2
                id="profile-heading"
                className="text-xl font-semibold sm:text-2xl"
              >
                Profile Information
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Your account details in one place.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Name
              </p>

              <p className="mt-2 break-words text-base font-medium text-slate-100">
                {user.name || "Not provided"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Email
              </p>

              <p className="mt-2 break-all text-base font-medium text-slate-100">
                {user.email}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Member Since
              </p>

              <p className="mt-2 text-base font-medium text-slate-100">
                {createdDate}
              </p>
            </div>
          </div>

          <EditProfileForm currentName={user.name || ""} />
        </section>

        <section
          aria-labelledby="explore-heading"
          className="mt-8"
        >
          <div className="mb-4">
            <p className="text-xs font-semibold tracking-[0.2em] text-emerald-400">
              YOUR SPACE
            </p>

            <h2
              id="explore-heading"
              className="mt-2 text-2xl font-bold sm:text-3xl"
            >
              Explore HalalWise
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Pick up where you want to continue.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <a
              href="/learn"
              className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition duration-200 hover:-translate-y-1 hover:border-emerald-500 hover:bg-slate-800 sm:p-6"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-950 text-2xl transition group-hover:bg-emerald-900">
                📚
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                My Learning
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Continue learning Islamic finance concepts.
              </p>

              <p className="mt-4 text-sm font-medium text-emerald-400">
                Explore learning <span aria-hidden="true">→</span>
              </p>
            </a>

            <a
              href="/finance"
              className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition duration-200 hover:-translate-y-1 hover:border-emerald-500 hover:bg-slate-800 sm:p-6"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-950 text-2xl transition group-hover:bg-emerald-900">
                💰
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                My Finance
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Explore halal investment research.
              </p>

              <p className="mt-4 text-sm font-medium text-emerald-400">
                Explore finance <span aria-hidden="true">→</span>
              </p>
            </a>

            <a
              href="/assistant"
              className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition duration-200 hover:-translate-y-1 hover:border-emerald-500 hover:bg-slate-800 sm:p-6"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-950 text-2xl transition group-hover:bg-emerald-900">
                🤖
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                Islamic Assistant
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Ask questions and explore source-grounded answers.
              </p>

              <p className="mt-4 text-sm font-medium text-emerald-400">
                Ask a question <span aria-hidden="true">→</span>
              </p>
            </a>

            <a
              href="/account/bookmarks"
              className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition duration-200 hover:-translate-y-1 hover:border-emerald-500 hover:bg-slate-800 sm:p-6"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-950 text-2xl transition group-hover:bg-emerald-900">
                🔖
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                My Bookmarks
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                View and revisit the content you've saved.
              </p>

              <p className="mt-4 text-sm font-medium text-emerald-400">
                View bookmarks <span aria-hidden="true">→</span>
              </p>
            </a>

            <SavedHadithLink />

            <a
              href="/account/history"
              className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition duration-200 hover:-translate-y-1 hover:border-emerald-500 hover:bg-slate-800 sm:p-6"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-950 text-2xl transition group-hover:bg-emerald-900">
                🕘
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                Question History
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Revisit questions and answers from the Islamic Assistant.
              </p>

              <p className="mt-4 text-sm font-medium text-emerald-400">
                View history <span aria-hidden="true">→</span>
              </p>
            </a>

            <a
              href="/account/watchlist"
              className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition duration-200 hover:-translate-y-1 hover:border-emerald-500 hover:bg-slate-800 sm:p-6"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-950 text-2xl transition group-hover:bg-emerald-900">
                ⭐
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                Stock Watchlist
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Keep track of stocks you want to review later.
              </p>

              <p className="mt-4 text-sm font-medium text-emerald-400">
                View watchlist <span aria-hidden="true">→</span>
              </p>
            </a>
            
<a
  href="/account/progress"
  className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition duration-200 hover:-translate-y-1 hover:border-emerald-500 hover:bg-slate-800 sm:p-6"
>
  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-950 text-2xl transition group-hover:bg-emerald-900">
    📚
  </div>

  <h3 className="mt-5 text-lg font-semibold">
    Learning Progress
  </h3>

  <p className="mt-2 text-sm leading-6 text-slate-400">
    Track the lessons you have completed and continue your learning journey.
  </p>

  <p className="mt-4 text-sm font-medium text-emerald-400">
    View progress <span aria-hidden="true">→</span>
  </p>
</a>

          </div>
        </section>

        <section
          aria-labelledby="security-heading"
          className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10 sm:p-7"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-950 text-xl">
              🔒
            </div>

            <div>
              <h2
                id="security-heading"
                className="text-xl font-semibold sm:text-2xl"
              >
                Security
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-400">
                Keep your account secure by using a strong, unique password.
              </p>
            </div>
          </div>

          <ChangePasswordForm />
        </section>

        <section
          aria-labelledby="account-heading"
          className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 sm:p-7"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-xl">
              ⚙️
            </div>

            <div>
              <h2
                id="account-heading"
                className="text-xl font-semibold sm:text-2xl"
              >
                Account
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-400">
                Sign out of your HalalWise account on this device.
              </p>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-800 pt-5">
            <LogoutButton />
          </div>
        </section>

        <p className="mt-8 text-center text-xs text-slate-500">
          HalalWise · Learn with knowledge and care.
        </p>
      </div>
    </main>
  );
}
