import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { isExternalHref, safeHref } from "@/lib/markdown-links";

/**
 * The ONE Markdown renderer (SPEC §14.1). Raw HTML is never rendered (no rehype-raw);
 * unsafe link schemes are dropped; external links open in a new tab.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        urlTransform={(url) => safeHref(url) ?? ""}
        components={{
          a({ href, children: content }) {
            const safe = safeHref(href);
            if (!safe) return <span>{content}</span>;
            return isExternalHref(safe) ? (
              <a href={safe} target="_blank" rel="noopener noreferrer">
                {content}
              </a>
            ) : (
              <a href={safe}>{content}</a>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
