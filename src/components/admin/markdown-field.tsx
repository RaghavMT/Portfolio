"use client";

import { useState } from "react";
import { Markdown } from "@/lib/markdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  rows?: number;
  invalid?: boolean;
  describedBy?: string;
};

/** Write / Preview tabs; the preview uses the same renderer as the public site (SPEC §9.1). */
export function MarkdownField({
  id,
  value,
  onChange,
  onBlur,
  rows = 6,
  invalid,
  describedBy,
}: Props) {
  const [tab, setTab] = useState("write");
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="write">Write</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
      </TabsList>
      <TabsContent value="write">
        <Textarea
          id={id}
          value={value}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={invalid}
          aria-describedby={describedBy}
        />
      </TabsContent>
      <TabsContent value="preview">
        <div className="min-h-24 rounded-lg border p-3 text-sm">
          {value.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            <p className="text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
