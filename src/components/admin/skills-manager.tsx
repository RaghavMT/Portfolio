"use client";

import {
  deleteSkillGroup,
  reorderSkillGroups,
  setSkillGroupVisible,
} from "@/server/actions/admin/skills";
import type { AdminSkillGroup } from "@/server/admin/queries";
import { ResourceManager } from "./resource-manager";
import { SkillChips } from "./skill-chips";
import { SkillGroupForm } from "./skill-group-form";

const plural = (n: number) => `${n} skill${n === 1 ? "" : "s"}`;

export function SkillsManager({ groups }: { groups: AdminSkillGroup[] }) {
  return (
    <ResourceManager
      items={groups}
      noun="skill group"
      getLabel={(g) => g.name}
      renderSummary={(g) => (
        <>
          <p className="truncate font-medium">{g.name}</p>
          <SkillChips groupId={g.id} groupName={g.name} skills={g.skills} />
        </>
      )}
      renderForm={({ item, onDone }) => (
        <SkillGroupForm key={item?.id ?? "new"} item={item} onDone={onDone} />
      )}
      sheetDescription="A group of related skills, shown together as chips."
      deleteDescription={(g) => (
        <>
          This deletes the group and its {plural(g.skills.length)}. It will
          disappear from your site immediately.
        </>
      )}
      empty={{
        title: "No skill groups yet",
        hint: "Start with a group like Languages, then add skills as chips.",
      }}
      actions={{
        reorder: reorderSkillGroups,
        setVisible: setSkillGroupVisible,
        remove: deleteSkillGroup,
      }}
    />
  );
}
