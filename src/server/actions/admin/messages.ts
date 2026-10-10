"use server";

import { requireAdmin } from "../../auth/require-admin";
import {
  removeMessage,
  setMessageArchived,
  setMessageRead,
} from "../../admin/messages";

export async function markMessageRead(id: unknown, read: unknown) {
  await requireAdmin();
  return setMessageRead(id, read);
}

export async function archiveMessage(id: unknown, archived: unknown) {
  await requireAdmin();
  return setMessageArchived(id, archived);
}

export async function deleteMessage(id: unknown) {
  await requireAdmin();
  return removeMessage(id);
}
