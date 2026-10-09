import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col items-start justify-center gap-4 px-4 py-24">
      <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground">
        That page doesn&apos;t exist, or it hasn&apos;t been published yet.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-md bg-brand px-5 font-medium text-brand-foreground"
      >
        Back to the home page
      </Link>
    </main>
  );
}
