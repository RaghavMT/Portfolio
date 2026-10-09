"use client";

import { EMPLOYMENT_LABELS } from "@/lib/labels";
import {
  deleteExperience,
  reorderExperience,
  setExperienceVisible,
} from "@/server/actions/admin/experience";
import type { AdminExperience } from "@/server/admin/queries";
import { ExperienceForm } from "./experience-form";
import { ResourceManager } from "./resource-manager";

export function ExperienceManager({ items }: { items: AdminExperience[] }) {
  const tagSuggestions = [...new Set(items.flatMap((e) => e.tech))];
  return (
    <ResourceManager
      items={items}
      noun="experience"
      getLabel={(e) => `${e.title} at ${e.company}`}
      renderSummary={(e) => (
        <>
          <p className="truncate font-medium">{e.title}</p>
          <p className="truncate text-sm text-muted-foreground">
            {e.company} · {EMPLOYMENT_LABELS[e.employmentType]}
          </p>
        </>
      )}
      renderForm={({ item, onDone }) => (
        <ExperienceForm
          key={item?.id ?? "new"}
          item={item}
          tagSuggestions={tagSuggestions}
          onDone={onDone}
        />
      )}
      sheetDescription="Jobs, internships and freelance work shown on your site."
      empty={{
        title: "No experience yet",
        hint: "Add internships, jobs or freelance work, even short ones.",
      }}
      actions={{
        reorder: reorderExperience,
        setVisible: setExperienceVisible,
        remove: deleteExperience,
      }}
    />
  );
}
