"use client";

import { socialLabel } from "@/lib/social";
import type { AdminSocialLink } from "@/server/admin/queries";
import {
  deleteSocialLink,
  reorderSocialLinks,
  setSocialLinkVisible,
} from "@/server/actions/admin/social-links";
import { ResourceManager } from "./resource-manager";
import { SocialLinkForm } from "./social-link-form";

export function SocialLinksManager({ links }: { links: AdminSocialLink[] }) {
  return (
    <ResourceManager
      items={links}
      noun="link"
      getLabel={(l) => socialLabel(l.platform, l.label)}
      renderSummary={(l) => (
        <>
          <p className="truncate font-medium">
            {socialLabel(l.platform, l.label)}
          </p>
          <p className="truncate text-sm text-muted-foreground">{l.url}</p>
        </>
      )}
      renderForm={({ item, onDone }) => (
        <SocialLinkForm key={item?.id ?? "new"} link={item} onDone={onDone} />
      )}
      sheetDescription="Shown in your site's hero, contact section and footer."
      empty={{
        title: "No links yet",
        hint: "Add your GitHub, LinkedIn and email so recruiters can reach you.",
      }}
      actions={{
        reorder: reorderSocialLinks,
        setVisible: setSocialLinkVisible,
        remove: deleteSocialLink,
      }}
    />
  );
}
