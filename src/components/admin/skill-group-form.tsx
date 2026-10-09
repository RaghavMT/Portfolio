"use client";

import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { skillGroupSchema } from "@/lib/validation/skill";
import {
  createSkillGroup,
  updateSkillGroup,
} from "@/server/actions/admin/skills";
import type { AdminSkillGroup } from "@/server/admin/queries";
import { Field, useEntityForm } from "./entity-form";
import { FormActions, SwitchRow } from "./form-parts";

export function SkillGroupForm({
  item,
  onDone,
}: {
  item?: AdminSkillGroup;
  onDone: () => void;
}) {
  const { form, onSubmit, pending } = useEntityForm({
    schema: skillGroupSchema,
    defaultValues: { name: item?.name ?? "", visible: item?.visible ?? true },
    submit: (values) =>
      item ? updateSkillGroup(item.id, values) : createSkillGroup(values),
    onSaved: onDone,
  });
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <Field
        id="sg-name"
        label="Group name"
        required
        help="e.g. Languages, Frameworks, Data & ML, Tools."
        error={errors.name?.message as string | undefined}
        count={String(watch("name") ?? "").length}
        max={40}
      >
        <Input
          id="sg-name"
          aria-invalid={!!errors.name}
          aria-describedby="sg-name-help"
          {...register("name")}
        />
      </Field>
      <Controller
        control={control}
        name="visible"
        render={({ field }) => (
          <SwitchRow
            id="sg-visible"
            label="Show on my site"
            checked={field.value ?? true}
            onChange={field.onChange}
          />
        )}
      />
      <FormActions
        pending={pending}
        submitLabel={item ? "Save changes" : "Add group"}
        onCancel={onDone}
      />
    </form>
  );
}
