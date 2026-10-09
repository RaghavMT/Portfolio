import { requireAdminPage } from "@/server/auth/require-admin";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  await requireAdminPage();
  return (
    <section>
      <h1 className="text-2xl font-semibold">Messages</h1>
      <p className="mt-2 text-muted-foreground">
        The inbox arrives in a later phase.
      </p>
    </section>
  );
}
