"use client";

import {
  Archive,
  ArchiveRestore,
  Mail,
  MailOpen,
  Reply,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatAdminTimestamp, formatRelativeTime } from "@/lib/format";
import { replyMailto } from "@/lib/contact-rules";
import {
  archiveMessage,
  deleteMessage,
  markMessageRead,
} from "@/server/actions/admin/messages";
import type { AdminMessage } from "@/server/admin/queries";
import { ConfirmDialog } from "./confirm-dialog";

type View = "inbox" | "archived";

const preview = (m: AdminMessage) =>
  m.subject?.trim() || m.body.replace(/\s+/g, " ").slice(0, 90);

/** Inbox / Archived list with a side sheet for the full message (SPEC §9.8). */
export function MessagesInbox({ messages }: { messages: AdminMessage[] }) {
  const router = useRouter();
  const [view, setView] = useState<View>("inbox");
  const [openId, setOpenId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AdminMessage | null>(null);
  const [busy, start] = useTransition();

  const inbox = messages.filter((m) => !m.archived);
  const archived = messages.filter((m) => m.archived);
  const shown = view === "inbox" ? inbox : archived;
  const unread = inbox.filter((m) => !m.readAt).length;
  // Derived from the fresh server data, so it follows router.refresh().
  const open = messages.find((m) => m.id === openId) ?? null;

  function run(
    work: () => Promise<{ ok: boolean; error?: string }>,
    success?: string,
    after?: () => void,
  ) {
    start(async () => {
      const result = await work();
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      if (success) toast.success(success);
      after?.();
      router.refresh();
    });
  }

  function openMessage(m: AdminMessage) {
    setOpenId(m.id);
    if (!m.readAt) run(() => markMessageRead(m.id, true));
  }

  return (
    <>
      <Tabs value={view} onValueChange={(v) => setView(v as View)}>
        <TabsList aria-label="Message folders">
          <TabsTrigger value="inbox">
            Inbox{unread > 0 ? ` (${unread} unread)` : ""}
          </TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        {/* One panel for whichever folder is active, so the selected tab always has its tabpanel. */}
        <TabsContent value={view}>
          {shown.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">
                {view === "inbox" ? "No messages yet" : "Nothing archived"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {view === "inbox"
                  ? "Messages from the contact form on your site will show up here."
                  : "Archived messages are kept here, out of your inbox."}
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y rounded-lg border">
              {shown.map((m) => {
                const isUnread = !m.readAt;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => openMessage(m)}
                      className="flex min-h-14 w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      {isUnread ? (
                        <Mail className="mt-0.5 size-4 shrink-0" aria-hidden />
                      ) : (
                        <MailOpen
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span className={isUnread ? "font-semibold" : ""}>
                            {m.name}
                          </span>
                          <span className="truncate text-sm text-muted-foreground">
                            {m.email}
                          </span>
                          {isUnread ? (
                            <span className="rounded-md bg-brand px-1.5 py-0.5 text-xs font-medium text-brand-foreground">
                              Unread
                            </span>
                          ) : null}
                        </span>
                        <span
                          className={`block truncate text-sm ${isUnread ? "font-medium" : "text-muted-foreground"}`}
                        >
                          {preview(m)}
                        </span>
                      </span>
                      <time
                        dateTime={m.createdAt.toISOString()}
                        suppressHydrationWarning
                        className="shrink-0 text-xs text-muted-foreground"
                      >
                        {formatRelativeTime(m.createdAt)}
                      </time>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={open !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {open ? (
            <>
              <SheetHeader>
                <SheetTitle>
                  {open.subject?.trim() || "(no subject)"}
                </SheetTitle>
                <SheetDescription>
                  From {open.name} · {formatAdminTimestamp(open.createdAt)}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-4">
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="break-all">{open.email}</dd>
                  {open.company ? (
                    <>
                      <dt className="text-muted-foreground">Company</dt>
                      <dd>{open.company}</dd>
                    </>
                  ) : null}
                </dl>
                <p className="text-sm break-words whitespace-pre-wrap">
                  {open.body}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="lg">
                    <a href={replyMailto(open.email, open.subject)}>
                      <Reply aria-hidden /> Reply
                    </a>
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => markMessageRead(open.id, false),
                        "Marked as unread",
                        () => setOpenId(null),
                      )
                    }
                  >
                    <Mail aria-hidden /> Mark unread
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => archiveMessage(open.id, !open.archived),
                        open.archived ? "Moved to inbox" : "Archived",
                        () => setOpenId(null),
                      )
                    }
                  >
                    {open.archived ? (
                      <>
                        <ArchiveRestore aria-hidden /> Move to inbox
                      </>
                    ) : (
                      <>
                        <Archive aria-hidden /> Archive
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setDeleting(open)}
                  >
                    <Trash2 aria-hidden /> Delete
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete the message from ${deleting?.name ?? ""}?`}
        description="It is removed for good and can't be recovered."
        pending={busy}
        onConfirm={() => {
          const target = deleting;
          if (!target) return;
          run(
            () => deleteMessage(target.id),
            "Message deleted",
            () => {
              setDeleting(null);
              setOpenId(null);
            },
          );
        }}
      />
    </>
  );
}
