"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col items-start justify-center gap-4 px-4 py-24">
      <h1 className="text-3xl font-bold tracking-tight">
        Something went wrong
      </h1>
      <p className="text-muted-foreground">
        Please try again, or head back to the home page.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center rounded-md bg-brand px-5 font-medium text-brand-foreground"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-md border px-5 font-medium"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
