import { MessagesInbox } from "@/components/admin/messages-inbox";
import { listMessages } from "@/server/admin/queries";
import { requireAdminPage } from "@/server/auth/require-admin";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  await requireAdminPage();
  const messages = await listMessages();
  return (
    <section className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Messages</h1>
      <p className="mt-1 mb-6 text-muted-foreground">
        What visitors sent through the contact form. Opening a message marks it
        read; archive it to tidy the inbox.
      </p>
      <MessagesInbox messages={messages} />
    </section>
  );
}
