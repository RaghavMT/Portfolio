import { Section } from "@/components/public/section";
import type { getSkillGroups } from "@/server/queries/public";

type Group = Awaited<ReturnType<typeof getSkillGroups>>[number];

/** Chips only: no levels or percentages (D6). */
export function SkillsSection({ groups }: { groups: Group[] }) {
  return (
    <Section id="skills" title="Skills">
      <div className="grid gap-6 sm:grid-cols-2">
        {groups.map((group) => (
          <div key={group.id}>
            <h3 className="mb-3 font-medium">{group.name}</h3>
            <ul className="flex flex-wrap gap-2">
              {group.skills.map((skill) => (
                <li
                  key={skill.id}
                  className="rounded-md border bg-card px-3 py-1 text-sm"
                >
                  {skill.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}
