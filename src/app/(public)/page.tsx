import { AboutSection } from "@/components/public/about-section";
import { CertificationsSection } from "@/components/public/certifications-section";
import { ContactSection } from "@/components/public/contact-section";
import { EducationSection } from "@/components/public/education-section";
import { ExperienceSection } from "@/components/public/experience-section";
import { Hero } from "@/components/public/hero";
import { ProjectsSection } from "@/components/public/projects-section";
import { SkillsSection } from "@/components/public/skills-section";
import { pickHomeProjects, renderableSections } from "@/lib/sections";
import {
  getCertifications,
  getEducation,
  getExperiences,
  getPublishedProjects,
  getSettings,
  getSkillGroups,
  getSocialLinks,
} from "@/server/queries/public";

export default async function HomePage() {
  const [
    settings,
    socials,
    published,
    experiences,
    skillGroups,
    education,
    certifications,
  ] = await Promise.all([
    getSettings(),
    getSocialLinks(),
    getPublishedProjects(),
    getExperiences(),
    getSkillGroups(),
    getEducation(),
    getCertifications(),
  ]);
  if (!settings) return null; // the layout already shows the "coming soon" page

  const home = pickHomeProjects(published);
  const sections = renderableSections(settings.sections, {
    about: settings.aboutMd.trim() ? 1 : 0,
    projects: home.projects.length,
    experience: experiences.length,
    skills: skillGroups.length,
    education: education.length,
    certifications: certifications.length,
  });

  return (
    <>
      <Hero settings={settings} socials={socials} />
      {sections.map(({ key }) => {
        switch (key) {
          case "about":
            return <AboutSection key={key} aboutMd={settings.aboutMd} />;
          case "projects":
            return (
              <ProjectsSection
                key={key}
                projects={home.projects}
                hasMore={home.hasMore}
              />
            );
          case "experience":
            return <ExperienceSection key={key} items={experiences} />;
          case "skills":
            return <SkillsSection key={key} groups={skillGroups} />;
          case "education":
            return <EducationSection key={key} items={education} />;
          case "certifications":
            return <CertificationsSection key={key} items={certifications} />;
          case "contact":
            return (
              <ContactSection
                key={key}
                email={settings.contactEmail}
                socials={socials}
              />
            );
        }
      })}
    </>
  );
}
