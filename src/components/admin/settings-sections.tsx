"use client";

import { useMemo } from "react";
import type { ActionResult } from "@/lib/action-result";
import type { Section, SectionKey } from "@/lib/validation/site-settings";
import { updateSections } from "@/server/actions/admin/settings";
import { SortableList } from "./sortable-list";
import { VisibilityToggle } from "./visibility-toggle";

export const SECTION_LABELS: Record<SectionKey, string> = {
  about: "About",
  projects: "Projects",
  experience: "Experience",
  skills: "Skills",
  education: "Education",
  certifications: "Certifications",
  contact: "Contact",
};

type Item = { id: SectionKey; visible: boolean };

/** Home-page section order and visibility (SPEC §9.9). Hero is always first, footer always last. */
export function SettingsSections({ sections }: { sections: Section[] }) {
  // Stable identity: SortableList treats a new array as fresh server data and resets its local order.
  const items = useMemo<Item[]>(
    () => sections.map((s) => ({ id: s.key, visible: s.visible })),
    [sections],
  );

  function save(next: Item[]): Promise<ActionResult<void>> {
    return updateSections(next.map((i) => ({ key: i.id, visible: i.visible })));
  }

  return (
    <SortableList
      items={items}
      noun="section"
      getLabel={(i) => SECTION_LABELS[i.id]}
      onReorder={(ids) =>
        save(ids.map((id) => items.find((i) => i.id === id)!))
      }
      renderItem={(i) => (
        <p className={i.visible ? "font-medium" : "font-medium opacity-60"}>
          {SECTION_LABELS[i.id]}
          {i.visible ? null : (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              Hidden
            </span>
          )}
        </p>
      )}
      renderActions={(i) => (
        <VisibilityToggle
          visible={i.visible}
          label={SECTION_LABELS[i.id]}
          onChange={(visible) =>
            save(items.map((x) => (x.id === i.id ? { ...x, visible } : x)))
          }
        />
      )}
    />
  );
}
