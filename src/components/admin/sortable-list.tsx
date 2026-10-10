"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action-result";
import { moveItem } from "@/lib/admin/reorder";
import { Button } from "@/components/ui/button";

const SAVE_DELAY_MS = 500;

type Props<T extends { id: string }> = {
  items: T[];
  /** Short noun used in aria-labels and toasts, e.g. "link". */
  noun: string;
  getLabel: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  renderActions?: (item: T) => ReactNode;
  onReorder: (ids: string[]) => Promise<ActionResult<void>>;
  /** False hides the handle and ↑/↓ (e.g. while a filter shows only part of the list). Default true. */
  reorderable?: boolean;
};

function Row<T extends { id: string }>({
  item,
  index,
  count,
  noun,
  label,
  onMove,
  children,
  actions,
  reorderable,
}: {
  item: T;
  index: number;
  count: number;
  noun: string;
  label: string;
  onMove: (from: number, to: number) => void;
  children: ReactNode;
  actions?: ReactNode;
  reorderable: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2 sm:flex-nowrap ${isDragging ? "z-10 shadow-lg" : ""}`}
    >
      {reorderable ? (
        <button
          type="button"
          className="flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          aria-label={`Drag to reorder ${label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
      ) : null}
      <div className="min-w-0 flex-1 basis-40">{children}</div>
      <div className="flex shrink-0 items-center gap-1">
        {actions}
        {reorderable ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={index === 0}
              onClick={() => onMove(index, index - 1)}
              aria-label={`Move ${noun} ${label} up`}
            >
              <ArrowUp aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={index === count - 1}
              onClick={() => onMove(index, index + 1)}
              aria-label={`Move ${noun} ${label} down`}
            >
              <ArrowDown aria-hidden />
            </Button>
          </>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Reorderable list (SPEC §9.1): drag handle AND ↑/↓ buttons. The new order shows immediately and is
 * saved 500 ms after the last change; a failure restores the server order and says why.
 */
export function SortableList<T extends { id: string }>({
  items,
  noun,
  getLabel,
  renderItem,
  renderActions,
  onReorder,
  reorderable = true,
}: Props<T>) {
  const router = useRouter();
  const [ordered, setOrdered] = useState(items);
  const [seenItems, setSeenItems] = useState(items);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A refresh after any mutation brings fresh server data; trust it over local state.
  if (items !== seenItems) {
    setSeenItems(items);
    setOrdered(items);
  }
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function schedule(next: T[]) {
    setOrdered(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const result = await onReorder(next.map((i) => i.id));
      if (result.ok) {
        toast.success("Order saved — live on your site");
      } else {
        toast.error(result.error);
        setOrdered(items);
      }
      router.refresh();
    }, SAVE_DELAY_MS);
  }

  function move(from: number, to: number) {
    schedule(moveItem(ordered, from, to));
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = ordered.findIndex((i) => i.id === active.id);
    const to = ordered.findIndex((i) => i.id === over.id);
    move(from, to);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={ordered.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="space-y-2">
          {ordered.map((item, index) => (
            <Row
              key={item.id}
              item={item}
              index={index}
              count={ordered.length}
              noun={noun}
              label={getLabel(item)}
              onMove={move}
              actions={renderActions?.(item)}
              reorderable={reorderable}
            >
              {renderItem(item)}
            </Row>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
