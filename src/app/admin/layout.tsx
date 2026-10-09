import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";

// SPEC §9.1: every admin page is noindex/nofollow.
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      {children}
      <Toaster position="bottom-right" closeButton />
    </>
  );
}
