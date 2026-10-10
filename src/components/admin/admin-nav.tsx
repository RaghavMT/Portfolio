"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ExternalLink, LogOut, Menu } from "lucide-react";
import { logout } from "@/server/actions/auth";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/profile", label: "Profile" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/experience", label: "Experience" },
  { href: "/admin/education", label: "Education" },
  { href: "/admin/skills", label: "Skills" },
  { href: "/admin/certifications", label: "Certifications" },
  { href: "/admin/social", label: "Social links" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/settings", label: "Settings" },
];

const item =
  "flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm transition-colors hover:bg-muted";

function NavList({ pathname, badge }: { pathname: string; badge: ReactNode }) {
  return (
    <>
      <ul className="space-y-1">
        {LINKS.map((l) => {
          const active =
            l.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`${item} ${active ? "bg-muted font-medium" : "text-muted-foreground"}`}
              >
                {l.label}
                {l.href === "/admin/messages" ? badge : null}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 space-y-1 border-t pt-4">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className={`${item} text-muted-foreground`}
        >
          View site <ExternalLink className="size-3.5" aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <form action={logout}>
          <button type="submit" className={`${item} text-muted-foreground`}>
            <LogOut className="size-4" aria-hidden /> Log out
          </button>
        </form>
      </div>
    </>
  );
}

/** Sidebar on desktop; a top disclosure menu at narrow widths (SPEC §9.1). */
export function AdminNav({ badge }: { badge?: ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 overflow-y-auto border-r p-4 md:block">
        <p className="mb-4 px-3 font-semibold">Admin</p>
        <nav aria-label="Admin">
          <NavList pathname={pathname} badge={badge} />
        </nav>
      </aside>
      <header className="border-b md:hidden">
        <details className="group">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-semibold">
            Admin
            <Menu className="size-5" aria-hidden />
            <span className="sr-only">Toggle menu</span>
          </summary>
          <nav aria-label="Admin" className="border-t p-4">
            <NavList pathname={pathname} badge={badge} />
          </nav>
        </details>
      </header>
    </>
  );
}
