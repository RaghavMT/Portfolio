import { cacheLife } from "next/cache";
import { formatDuration } from "@/lib/format";

/** Open-ended jobs count up to "now", which is a wall-clock read: keep it in a cache scope. */
export async function Duration({
  start,
  end,
}: {
  start: string;
  end: string | null;
}) {
  "use cache";
  cacheLife("days");
  return <>{formatDuration(start, end)}</>;
}
