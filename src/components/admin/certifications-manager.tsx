"use client";

import { CERTIFICATION_LABELS } from "@/lib/labels";
import {
  deleteCertification,
  reorderCertifications,
  setCertificationVisible,
} from "@/server/actions/admin/certifications";
import type { AdminCertification } from "@/server/admin/queries";
import { CertificationForm } from "./certification-form";
import { ResourceManager } from "./resource-manager";

export function CertificationsManager({
  items,
}: {
  items: AdminCertification[];
}) {
  return (
    <ResourceManager
      items={items}
      noun="certification"
      getLabel={(c) => c.title}
      renderSummary={(c) => (
        <>
          <p className="truncate font-medium">{c.title}</p>
          <p className="truncate text-sm text-muted-foreground">
            {CERTIFICATION_LABELS[c.kind]}
            {c.issuer ? ` · ${c.issuer}` : ""}
          </p>
        </>
      )}
      renderForm={({ item, onDone }) => (
        <CertificationForm
          key={item?.id ?? "new"}
          item={item}
          onDone={onDone}
        />
      )}
      sheetDescription="Certifications, awards and achievements shown on your site."
      empty={{
        title: "No certifications yet",
        hint: "Add courses, certificates or awards that back up your skills.",
      }}
      actions={{
        reorder: reorderCertifications,
        setVisible: setCertificationVisible,
        remove: deleteCertification,
      }}
    />
  );
}
