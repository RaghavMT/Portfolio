import { Section } from "@/components/public/section";
import { Markdown } from "@/lib/markdown";

export function AboutSection({ aboutMd }: { aboutMd: string }) {
  return (
    <Section id="about" title="About">
      <div className="max-w-3xl">
        <Markdown>{aboutMd}</Markdown>
      </div>
    </Section>
  );
}
