import type { ReactNode } from "react";

/** Shared wrapper for a home-page section: anchor id, h2, consistent rhythm. */
export function Section({
  id,
  title,
  children,
  action,
}: {
  id: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="mx-auto w-full max-w-[1100px] px-4 py-12 sm:py-16"
    >
      <div className="mb-8 flex items-baseline justify-between gap-4">
        <h2
          id={`${id}-heading`}
          className="text-2xl font-semibold tracking-tight"
        >
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function TagList({ tags, limit }: { tags: string[]; limit?: number }) {
  if (tags.length === 0) return null;
  const shown = limit ? tags.slice(0, limit) : tags;
  const extra = tags.length - shown.length;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Technologies">
      {shown.map((tag) => (
        <li
          key={tag}
          className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
        >
          {tag}
        </li>
      ))}
      {extra > 0 && (
        <li className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          +{extra}
        </li>
      )}
    </ul>
  );
}
