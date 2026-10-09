import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { safeNext } from "@/lib/safe-next";
import { UnauthorizedError, requireAdmin } from "@/server/auth/require-admin";

export const metadata = { title: "Log in" };

async function LoginContent({ next }: { next: Promise<string | undefined> }) {
  await cookies();
  const target = safeNext(await next);

  // Already logged in (valid cookie AND current session version) → straight to the admin.
  let loggedIn = true;
  try {
    await requireAdmin();
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) throw error;
    loggedIn = false;
  }
  if (loggedIn) redirect(target);

  return <LoginForm next={target} />;
}

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const next = searchParams.then((p) =>
    typeof p.next === "string" ? p.next : undefined,
  );
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold">Admin login</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Enter your admin password to manage the site.
      </p>
      <Suspense fallback={<div className="h-40" aria-hidden />}>
        <LoginContent next={next} />
      </Suspense>
    </main>
  );
}
