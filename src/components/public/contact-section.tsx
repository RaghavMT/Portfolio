import { Mail } from "lucide-react";
import { ContactForm } from "@/components/public/contact-form";
import { Section } from "@/components/public/section";
import { SocialLinks } from "@/components/public/social-links";
import type { getSocialLinks } from "@/server/queries/public";

type Socials = Awaited<ReturnType<typeof getSocialLinks>>;

/** Email, links and — when enabled in Settings — the contact form (FR-PUB-07). */
export function ContactSection({
  email,
  socials,
  formEnabled,
}: {
  email: string;
  socials: Socials;
  formEnabled: boolean;
}) {
  return (
    <Section id="contact" title="Get in touch">
      <p className="mb-4 max-w-xl text-muted-foreground">
        {formEnabled
          ? "Send me a message below, or reach me by email."
          : "The best way to reach me is by email."}
      </p>
      <a
        href={`mailto:${email}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-5 font-medium text-brand-foreground transition-opacity hover:opacity-90"
      >
        <Mail className="size-4" aria-hidden />
        {email}
      </a>
      {formEnabled ? (
        <div className="mt-10">
          <ContactForm />
        </div>
      ) : null}
      <SocialLinks links={socials} className="mt-6" />
    </Section>
  );
}
