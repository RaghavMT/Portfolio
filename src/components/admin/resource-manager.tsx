"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ConfirmDialog } from "./confirm-dialog";
import { SortableList } from "./sortable-list";
import { VisibilityToggle } from "./visibility-toggle";

type Editing<T> = { mode: "new" } | { mode: "edit"; item: T };

type Props<T extends { id: string; visible: boolean }> = {
  items: T[];
  /** Singular noun for buttons and toasts, e.g. "certification". */
  noun: string;
  getLabel: (item: T) => string;
  renderSummary: (item: T) => ReactNode;
  /** The entity's form; remount-safe: it is keyed by item id. */
  renderForm: (args: { item?: T; onDone: () => void }) => ReactNode;
  sheetDescription: string;
  empty: { title: string; hint: string };
  actions: {
    reorder: (ids: string[]) => Promise<ActionResult<void>>;
    setVisible: (id: string, visible: boolean) => Promise<ActionResult<void>>;
    remove: (id: string) => Promise<ActionResult<void>>;
  };
};

/**
 * The list + side-sheet pattern shared by social links, certifications, education and experience
 * (SPEC §9.6): reorder, visibility toggle, edit, delete-with-confirm, friendly empty state.
 */
export function ResourceManager<T extends { id: string; visible: boolean }>({
  items,
  noun,
  getLabel,
  renderSummary,
  renderForm,
  sheetDescription,
  empty,
  actions,
}: Props<T>) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing<T> | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);
  const [pending, setPending] = useState(false);

  async function confirmDelete() {
    if (!deleting) return;
    setPending(true);
    const result = await actions.remove(deleting.id);
    setPending(false);
    if (result.ok) {
      toast.success("Deleted — gone from your site");
      setDeleting(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const addButton = (
    <Button size="lg" onClick={() => setEditing({ mode: "new" })}>
      <Plus aria-hidden /> Add {noun}
    </Button>
  );

  return (
    <>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">{empty.title}</p>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            {empty.hint}
          </p>
          {addButton}
        </div>
      ) : (
        <>
          <div className="mb-4 flex justify-end">{addButton}</div>
          <SortableList
            items={items}
            noun={noun}
            getLabel={getLabel}
            onReorder={actions.reorder}
            renderItem={(item) => (
              <div className={item.visible ? "" : "opacity-60"}>
                {renderSummary(item)}
                {item.visible ? null : (
                  <p className="text-xs text-muted-foreground">Hidden</p>
                )}
              </div>
            )}
            renderActions={(item) => (
              <>
                <VisibilityToggle
                  visible={item.visible}
                  label={getLabel(item)}
                  onChange={(v) => actions.setVisible(item.id, v)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditing({ mode: "edit", item })}
                  aria-label={`Edit ${getLabel(item)}`}
                >
                  <Pencil aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleting(item)}
                  aria-label={`Delete ${getLabel(item)}`}
                >
                  <Trash2 aria-hidden />
                </Button>
              </>
            )}
          />
        </>
      )}

      <Sheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {editing?.mode === "edit" ? `Edit ${noun}` : `Add ${noun}`}
            </SheetTitle>
            <SheetDescription>{sheetDescription}</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            {editing
              ? renderForm({
                  item: editing.mode === "edit" ? editing.item : undefined,
                  onDone: () => setEditing(null),
                })
              : null}
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete “${deleting ? getLabel(deleting) : ""}”?`}
        description="It will disappear from your site immediately."
        pending={pending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
