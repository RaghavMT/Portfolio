import { SiteShell } from "@/components/public/site-shell";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return <SiteShell>{children}</SiteShell>;
}
