"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PopupComponent } from "@/lib/db/schema";
import { POPUP_COMPONENT_KINDS } from "@/lib/popup/defaults";
import {
  appendChild,
  createColumnsBlock,
  defaultComponentProps,
  findComponent,
  findParentId,
  newComponentId,
  patchComponent,
  removeComponent,
  reorderSiblings,
} from "@/lib/popup/component-tree";

const input =
  "w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[13px] text-ink outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/15";

const ADDABLE = POPUP_COMPONENT_KINDS.filter((k) => k.value !== "column");

type Props = {
  components: PopupComponent[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (next: PopupComponent[]) => void;
};

function labelForKind(kind: string) {
  if (kind === "column") return "Column";
  return (
    POPUP_COMPONENT_KINDS.find((k) => k.value === kind)?.label ??
    kind.replace(/_/g, " ")
  );
}

export function PopupComponentsCanvas({
  components,
  selectedId,
  onSelect,
  onChange,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const selected = selectedId
    ? findComponent(components, selectedId)
    : null;

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const parentId = findParentId(components, String(active.id));
    const overParent = findParentId(components, String(over.id));
    if (parentId !== overParent) return;
    onChange(
      reorderSiblings(
        components,
        parentId,
        String(active.id),
        String(over.id),
      ),
    );
  }

  function addRoot(kind: string) {
    if (kind === "columns") {
      const block = createColumnsBlock(2);
      onChange([...components, block]);
      onSelect(block.id);
      return;
    }
    const id = newComponentId(kind);
    onChange([
      ...components,
      { id, kind, props: defaultComponentProps(kind) },
    ]);
    onSelect(id);
  }

  function addIntoSelected(kind: string) {
    if (!selected) {
      addRoot(kind);
      return;
    }
    const parent =
      selected.kind === "column" || selected.kind === "columns"
        ? selected
        : findComponent(
            components,
            findParentId(components, selected.id) ?? "",
          );
    const target =
      selected.kind === "column"
        ? selected
        : selected.kind === "columns"
          ? selected.children?.[0]
          : parent?.kind === "column"
            ? parent
            : null;

    if (!target || (target.kind !== "column" && target.kind !== "columns")) {
      addRoot(kind);
      return;
    }

    if (kind === "columns" && target.kind === "column") {
      const nested = createColumnsBlock(2);
      onChange(appendChild(components, target.id, nested));
      onSelect(nested.id);
      return;
    }

    if (target.kind === "column") {
      const id = newComponentId(kind);
      onChange(
        appendChild(components, target.id, {
          id,
          kind,
          props: defaultComponentProps(kind),
        }),
      );
      onSelect(id);
    }
  }

  function patchSelected(patch: Record<string, unknown>) {
    if (!selected) return;
    onChange(
      patchComponent(components, selected.id, {
        props: { ...(selected.props ?? {}), ...patch },
      }),
    );
  }

  function setColumnCount(count: 2 | 3) {
    if (!selected || selected.kind !== "columns") return;
    const existing = selected.children ?? [];
    let children = [...existing];
    if (count > children.length) {
      while (children.length < count) {
        children.push({
          id: newComponentId("column"),
          kind: "column",
          props: {},
          colSpan: Math.floor(12 / count),
          children: [
            {
              id: newComponentId("paragraph"),
              kind: "paragraph",
              props: { text: `Column ${children.length + 1}` },
            },
          ],
        });
      }
    } else if (count < children.length) {
      children = children.slice(0, count);
    }
    children = children.map((c) => ({
      ...c,
      colSpan: Math.floor(12 / count),
    }));
    onChange(
      patchComponent(components, selected.id, {
        props: { ...(selected.props ?? {}), count },
        children,
      }),
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {ADDABLE.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => addRoot(c.value)}
            className="rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-muted hover:border-brand hover:text-brand"
          >
            + {c.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted">
        Use <span className="font-semibold text-ink">Columns</span> for a row,
        then select a column and add blocks — nest Columns inside a column for
        column-in-column.
      </p>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-h-[220px] rounded-xl border border-dashed border-line bg-[#f7f8fb] p-3">
          <p className="mb-2 text-[10px] font-semibold tracking-wide text-faint uppercase">
            Visual canvas · drag to reorder
          </p>
          {components.length === 0 ? (
            <p className="py-10 text-center text-[12px] text-muted">
              Add Columns or content blocks above.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={components.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-2">
                  {components.map((c) => (
                    <SortableRootBlock
                      key={c.id}
                      component={c}
                      selectedId={selectedId}
                      onSelect={onSelect}
                      onRemove={(id) => {
                        onChange(removeComponent(components, id));
                        if (selectedId === id) onSelect(null);
                      }}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <aside className="rounded-xl border border-line bg-white p-3">
          <p className="text-[10px] font-semibold tracking-wide text-faint uppercase">
            Block settings
          </p>
          {!selected ? (
            <p className="mt-3 text-[12px] text-muted">
              Select a block or column to edit.
            </p>
          ) : (
            <div className="mt-3 space-y-2.5">
              <p className="text-[12px] font-semibold capitalize text-ink">
                {labelForKind(selected.kind)}
              </p>

              {selected.kind === "columns" && (
                <>
                  <Field label="Column count">
                    <select
                      className={input}
                      value={Number(selected.props?.count ?? 2)}
                      onChange={(e) =>
                        setColumnCount(Number(e.target.value) as 2 | 3)
                      }
                    >
                      <option value={2}>2 columns</option>
                      <option value={3}>3 columns</option>
                    </select>
                  </Field>
                  <Field label="Gap (px)">
                    <input
                      className={input}
                      type="number"
                      value={Number(selected.props?.gap ?? 16)}
                      onChange={(e) =>
                        patchSelected({ gap: Number(e.target.value) || 0 })
                      }
                    />
                  </Field>
                  <label className="flex items-center gap-2 text-[11px]">
                    <input
                      type="checkbox"
                      checked={selected.props?.stackOnMobile !== false}
                      onChange={(e) =>
                        patchSelected({ stackOnMobile: e.target.checked })
                      }
                    />
                    Stack on mobile
                  </label>
                </>
              )}

              {selected.kind === "column" && (
                <div className="space-y-2">
                  <p className="text-[11px] text-muted">
                    Add blocks into this column:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {ADDABLE.filter((k) => k.value !== "columns")
                      .slice(0, 8)
                      .map((k) => (
                        <button
                          key={k.value}
                          type="button"
                          className="rounded border border-line px-1.5 py-0.5 text-[10px] font-semibold text-muted hover:border-brand hover:text-brand"
                          onClick={() => addIntoSelected(k.value)}
                        >
                          + {k.label}
                        </button>
                      ))}
                    <button
                      type="button"
                      className="rounded border border-brand/40 px-1.5 py-0.5 text-[10px] font-semibold text-brand"
                      onClick={() => addIntoSelected("columns")}
                    >
                      + Nested columns
                    </button>
                  </div>
                  <Field label="Col span (1–12)">
                    <input
                      className={input}
                      type="number"
                      min={1}
                      max={12}
                      value={selected.colSpan ?? 6}
                      onChange={(e) =>
                        onChange(
                          patchComponent(components, selected.id, {
                            colSpan: Number(e.target.value) || 6,
                          }),
                        )
                      }
                    />
                  </Field>
                </div>
              )}

              {(selected.kind === "headline" ||
                selected.kind === "paragraph") && (
                <Field label="Text">
                  <textarea
                    className={`${input} min-h-[72px]`}
                    value={String(selected.props?.text ?? "")}
                    onChange={(e) => patchSelected({ text: e.target.value })}
                  />
                </Field>
              )}
              {selected.kind === "image" && (
                <>
                  <Field label="Image URL">
                    <input
                      className={input}
                      value={String(selected.props?.src ?? "")}
                      onChange={(e) => patchSelected({ src: e.target.value })}
                    />
                  </Field>
                  <Field label="Alt">
                    <input
                      className={input}
                      value={String(selected.props?.alt ?? "")}
                      onChange={(e) => patchSelected({ alt: e.target.value })}
                    />
                  </Field>
                </>
              )}
              {(selected.kind === "video" || selected.kind === "qr") && (
                <Field label="URL">
                  <input
                    className={input}
                    value={String(
                      selected.props?.url ?? selected.props?.src ?? "",
                    )}
                    onChange={(e) => patchSelected({ url: e.target.value })}
                  />
                </Field>
              )}
              {selected.kind === "custom_html" && (
                <Field label="HTML">
                  <textarea
                    className={`${input} min-h-[120px] font-mono text-[11px]`}
                    value={String(selected.props?.html ?? "")}
                    onChange={(e) => patchSelected({ html: e.target.value })}
                  />
                </Field>
              )}
              {selected.kind === "spacer" && (
                <Field label="Height (px)">
                  <input
                    type="number"
                    className={input}
                    value={Number(selected.props?.height ?? 16)}
                    onChange={(e) =>
                      patchSelected({ height: Number(e.target.value) || 16 })
                    }
                  />
                </Field>
              )}
              {!["headline", "paragraph", "image", "video", "custom_html", "spacer", "divider", "qr", "columns", "column"].includes(
                selected.kind,
              ) && (
                <Field label="Label">
                  <input
                    className={input}
                    value={String(selected.props?.label ?? "")}
                    onChange={(e) => patchSelected({ label: e.target.value })}
                  />
                </Field>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function SortableRootBlock({
  component,
  selectedId,
  onSelect,
  onRemove,
}: {
  component: PopupComponent;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: component.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.75 : 1,
  };
  return (
    <li ref={setNodeRef} style={style}>
      <TreeBlock
        component={component}
        selectedId={selectedId}
        onSelect={onSelect}
        onRemove={onRemove}
        dragHandle={{ attributes, listeners }}
      />
    </li>
  );
}

function TreeBlock({
  component,
  selectedId,
  onSelect,
  onRemove,
  dragHandle,
}: {
  component: PopupComponent;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  dragHandle?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attributes: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listeners: any;
  };
}) {
  const selected = component.id === selectedId;
  const props = component.props ?? {};
  const isColumns = component.kind === "columns";
  const isColumn = component.kind === "column";

  return (
    <div
      className={`rounded-lg border bg-white ${
        selected ? "border-brand ring-2 ring-brand/20" : "border-line"
      }`}
    >
      <div className="flex items-center gap-2 border-b border-line/70 px-2 py-1.5">
        {dragHandle ? (
          <button
            type="button"
            className="cursor-grab px-1 text-[12px] text-faint active:cursor-grabbing"
            aria-label="Drag"
            {...dragHandle.attributes}
            {...dragHandle.listeners}
          >
            ⋮⋮
          </button>
        ) : (
          <span className="px-1 text-[12px] text-faint">·</span>
        )}
        <button
          type="button"
          onClick={() => onSelect(component.id)}
          className="min-w-0 flex-1 text-left text-[11px] font-semibold capitalize text-ink"
        >
          {labelForKind(component.kind)}
          {isColumns
            ? ` · ${Number(props.count ?? component.children?.length ?? 2)}`
            : ""}
          {isColumn && component.colSpan ? ` · span ${component.colSpan}` : ""}
        </button>
        <button
          type="button"
          className="text-[11px] font-semibold text-bad"
          onClick={() => onRemove(component.id)}
        >
          Remove
        </button>
      </div>

      {isColumns ? (
        <div
          className="grid gap-2 p-2"
          style={{
            gridTemplateColumns: `repeat(${Number(props.count ?? component.children?.length ?? 2)}, minmax(0, 1fr))`,
          }}
        >
          {(component.children ?? []).map((col) => (
            <div
              key={col.id}
              className={`rounded-md border border-dashed p-1.5 ${
                col.id === selectedId
                  ? "border-brand bg-brand/5"
                  : "border-line bg-[#fafbfc]"
              }`}
            >
              <button
                type="button"
                className="mb-1 w-full text-left text-[10px] font-semibold text-muted"
                onClick={() => onSelect(col.id)}
              >
                Column
              </button>
              <div className="space-y-1">
                {(col.children ?? []).map((child) => (
                  <TreeBlock
                    key={child.id}
                    component={child}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    onRemove={onRemove}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : isColumn ? (
        <div className="space-y-1 p-2">
          {(component.children ?? []).map((child) => (
            <TreeBlock
              key={child.id}
              component={child}
              selectedId={selectedId}
              onSelect={onSelect}
              onRemove={onRemove}
            />
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onSelect(component.id)}
          className="block w-full px-3 py-2.5 text-left"
        >
          <BlockPreview kind={component.kind} props={props} />
        </button>
      )}
    </div>
  );
}

function BlockPreview({
  kind,
  props,
}: {
  kind: string;
  props: Record<string, unknown>;
}) {
  if (kind === "headline") {
    return (
      <p className="text-[15px] font-bold text-ink">
        {String(props.text || "Headline")}
      </p>
    );
  }
  if (kind === "paragraph") {
    return (
      <p className="text-[12px] text-muted">{String(props.text || "Paragraph")}</p>
    );
  }
  if (kind === "image") {
    const src = String(props.src || "");
    if (src) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="max-h-24 w-full rounded object-cover" />
      );
    }
    return (
      <div className="rounded border border-dashed border-line py-6 text-center text-[11px] text-muted">
        Image URL
      </div>
    );
  }
  if (kind === "divider") return <div className="border-t border-line" />;
  if (kind === "spacer") {
    return (
      <div
        className="rounded bg-line/40"
        style={{ height: Number(props.height) || 16 }}
      />
    );
  }
  if (kind === "custom_html") {
    return (
      <p className="font-mono text-[10px] text-muted line-clamp-3">
        {String(props.html || "").trim() || "<custom html>"}
      </p>
    );
  }
  if (kind === "columns") {
    return (
      <p className="text-[11px] text-muted">
        Columns · {String(props.count ?? 2)}
      </p>
    );
  }
  return (
    <p className="text-[11px] text-muted">
      {String(props.label || labelForKind(kind))}
    </p>
  );
}
