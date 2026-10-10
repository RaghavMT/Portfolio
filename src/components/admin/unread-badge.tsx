import { countUnreadMessages } from "@/server/admin/queries";
import { requireAdmin } from "@/server/auth/require-admin";

async function unreadCount() {
  try {
    await requireAdmin();
    return await countUnreadMessages();
  } catch {
    return 0; // logged out or DB hiccup: the badge is cosmetic, so show nothing
  }
}

/** Unread count for the sidebar (SPEC §9.1). Renders nothing when zero. */
export async function UnreadBadge() {
  const unread = await unreadCount();
  if (unread === 0) return null;
  return (
    <span
      data-testid="unread-badge"
      className="ml-auto rounded-full bg-brand px-2 py-0.5 text-xs font-medium text-brand-foreground"
    >
      {unread}
      <span className="sr-only"> unread</span>
    </span>
  );
}
