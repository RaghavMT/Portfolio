"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { socialLabel } from "@/lib/social";
import type { AdminSocialLink } from "@/server/admin/queries";
import {
  deleteSocialLink,
  reorderSocialLinks,
  setSocialLinkVisible,
} from "@/server/actions/admin/social-links";
import { ConfirmDialog } from "./confirm-dialog";
import { SocialLinkForm } from "./social-link-form";
import { SortableList } from "./sortable-list";
import { VisibilityToggle } from "./visibility-toggle";

type Editing = { mode: "new" } | { mode: "edit"; link: AdminSocialLink };

export function SocialLinksManager({ links }: { links: AdminSocialLink[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<AdminSocialLink | null>(null);
  const [pending, setPending] = useState(false);

  async function confirmDelete() {
    if (!deleting) return;
    setPending(true);
    const result = await deleteSocialLink(deleting.id);
    setPending(false);
    if (result.ok) {
      toast.success("Deleted — gone from your site");
      setDeleting(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="lg" onClick={() => setEditing({ mode: "new" })}>
          <Plus aria-hidden /> Add link
        </Button>
      </div>

      {links.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">No links yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your GitHub, LinkedIn and email so recruiters can reach you.
          </p>
          <Button
            className="mt-4"
            size="lg"
            onClick={() => setEditing({ mode: "new" })}
          >
            <Plus aria-hidden /> Add link
          </Button>
        </div>
      ) : (
        <SortableList
          items={links}
          noun="link"
          getLabel={(l) => socialLabel(l.platform, l.label)}
          onReorder={reorderSocialLinks}
          renderItem={(l) => (
            <div className={l.visible ? "" : "opacity-60"}>
              <p className="truncate font-medium">
                {socialLabel(l.platform, l.label)}
                {l.visible ? null : (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    Hidden
                  </span>
                )}
              </p>
              <p className="truncate text-sm text-muted-foreground">{l.url}</p>
            </div>
          )}
          renderActions={(l) => (
            <>
              <VisibilityToggle
                visible={l.visible}
                label={socialLabel(l.platform, l.label)}
                onChange={(v) => setSocialLinkVisible(l.id, v)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setEditing({ mode: "edit", link: l })}
                aria-label={`Edit ${socialLabel(l.platform, l.label)}`}
              >
                <Pencil aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setDeleting(l)}
                aria-label={`Delete ${socialLabel(l.platform, l.label)}`}
              >
                <Trash2 aria-hidden />
              </Button>
            </>
          )}
        />
      )}

      <Sheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editing?.mode === "edit" ? "Edit link" : "Add link"}
            </SheetTitle>
            <SheetDescription>
              Shown in your site&apos;s hero, contact section and footer.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            {editing ? (
              <SocialLinkForm
                key={editing.mode === "edit" ? editing.link.id : "new"}
                link={editing.mode === "edit" ? editing.link : undefined}
                onDone={() => setEditing(null)}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete “${deleting ? socialLabel(deleting.platform, deleting.label) : ""}”?`}
        description="It will disappear from your site immediately."
        pending={pending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
