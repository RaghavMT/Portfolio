import { Code, ExternalLink, Globe, Mail } from "lucide-react";
import { socialLabel } from "@/lib/social";
import type { getSocialLinks } from "@/server/queries/public";

type Link = Awaited<ReturnType<typeof getSocialLinks>>[number];

function Icon({ platform }: { platform: Link["platform"] }) {
  const cls = "size-4";
  if (platform === "email") return <Mail className={cls} aria-hidden />;
  if (platform === "website") return <Globe className={cls} aria-hidden />;
  if (platform === "github" || platform === "leetcode" || platform === "kaggle")
    return <Code className={cls} aria-hidden />;
  return <ExternalLink className={cls} aria-hidden />;
}

export function SocialLinks({
  links,
  className = "",
}: {
  links: Link[];
  className?: string;
}) {
  if (links.length === 0) return null;
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {links.map((link) => {
        const external = !link.url.startsWith("mailto:");
        return (
          <li key={link.id}>
            <a
              href={link.url}
              {...(external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md border px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Icon platform={link.platform} />
              {socialLabel(link.platform, link.label)}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
