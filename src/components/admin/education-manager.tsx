"use client";

import {
  deleteEducation,
  reorderEducation,
  setEducationVisible,
} from "@/server/actions/admin/education";
import type { AdminEducation } from "@/server/admin/queries";
import { EducationForm } from "./education-form";
import { ResourceManager } from "./resource-manager";

export function EducationManager({ items }: { items: AdminEducation[] }) {
  return (
    <ResourceManager
      items={items}
      noun="education"
      getLabel={(e) => `${e.degree}, ${e.institution}`}
      renderSummary={(e) => (
        <>
          <p className="truncate font-medium">{e.institution}</p>
          <p className="truncate text-sm text-muted-foreground">
            {e.degree}
            {e.field ? ` · ${e.field}` : ""}
          </p>
        </>
      )}
      renderForm={({ item, onDone }) => (
        <EducationForm key={item?.id ?? "new"} item={item} onDone={onDone} />
      )}
      sheetDescription="Schools, colleges and degrees shown on your site."
      empty={{
        title: "No education yet",
        hint: "Add your degree so recruiters see where you studied.",
      }}
      actions={{
        reorder: reorderEducation,
        setVisible: setEducationVisible,
        remove: deleteEducation,
      }}
    />
  );
}
