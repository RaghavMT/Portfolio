import { cacheLife } from "next/cache";

/** Wall-clock reads must live in a cache scope under Cache Components; refreshed daily. */
export async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}
