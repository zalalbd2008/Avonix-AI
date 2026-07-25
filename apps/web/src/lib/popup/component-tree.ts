import type { PopupComponent } from "@/lib/db/schema";

export function newComponentId(kind: string) {
  return `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function defaultComponentProps(kind: string): Record<string, unknown> {
  switch (kind) {
    case "columns":
      return { count: 2, gap: 16, stackOnMobile: true };
    case "column":
      return {};
    case "headline":
      return { text: "Headline" };
    case "paragraph":
      return { text: "Supporting text" };
    case "image":
      return { src: "", alt: "" };
    case "video":
      return { url: "" };
    case "custom_html":
      return { html: "" };
    case "spacer":
      return { height: 16 };
    case "divider":
      return {};
    default:
      return { label: kind.replace(/_/g, " ") };
  }
}

/** Create a Columns row with N empty column children. */
export function createColumnsBlock(count: 2 | 3 = 2): PopupComponent {
  const id = newComponentId("columns");
  const cols: PopupComponent[] = Array.from({ length: count }, (_, i) => ({
    id: newComponentId("column"),
    kind: "column",
    props: {},
    colSpan: Math.floor(12 / count),
    children: [
      {
        id: newComponentId("paragraph"),
        kind: "paragraph",
        props: { text: `Column ${i + 1}` },
      },
    ],
  }));
  return {
    id,
    kind: "columns",
    props: { count, gap: 16, stackOnMobile: true },
    children: cols,
  };
}

/** Find a component by id anywhere in the tree. */
export function findComponent(
  list: PopupComponent[],
  id: string,
): PopupComponent | null {
  for (const c of list) {
    if (c.id === id) return c;
    if (c.children?.length) {
      const hit = findComponent(c.children, id);
      if (hit) return hit;
    }
  }
  return null;
}

/** Immutable map over the tree. */
export function mapComponents(
  list: PopupComponent[],
  fn: (c: PopupComponent) => PopupComponent,
): PopupComponent[] {
  return list.map((c) => {
    const next = fn(c);
    if (next.children?.length) {
      return { ...next, children: mapComponents(next.children, fn) };
    }
    return next;
  });
}

/** Remove node by id from tree. */
export function removeComponent(
  list: PopupComponent[],
  id: string,
): PopupComponent[] {
  return list
    .filter((c) => c.id !== id)
    .map((c) =>
      c.children?.length
        ? { ...c, children: removeComponent(c.children, id) }
        : c,
    );
}

/** Patch a node by id. */
export function patchComponent(
  list: PopupComponent[],
  id: string,
  patch: Partial<PopupComponent>,
): PopupComponent[] {
  return list.map((c) => {
    if (c.id === id) {
      return {
        ...c,
        ...patch,
        props:
          patch.props !== undefined
            ? { ...(c.props ?? {}), ...patch.props }
            : c.props,
      };
    }
    if (c.children?.length) {
      return { ...c, children: patchComponent(c.children, id, patch) };
    }
    return c;
  });
}

/** Append a child into a column (or columns row). */
export function appendChild(
  list: PopupComponent[],
  parentId: string,
  child: PopupComponent,
): PopupComponent[] {
  return list.map((c) => {
    if (c.id === parentId) {
      return { ...c, children: [...(c.children ?? []), child] };
    }
    if (c.children?.length) {
      return { ...c, children: appendChild(c.children, parentId, child) };
    }
    return c;
  });
}

/** Reorder siblings under a parent (or root when parentId is null). */
export function reorderSiblings(
  list: PopupComponent[],
  parentId: string | null,
  activeId: string,
  overId: string,
): PopupComponent[] {
  if (parentId == null) {
    const oldIndex = list.findIndex((c) => c.id === activeId);
    const newIndex = list.findIndex((c) => c.id === overId);
    if (oldIndex < 0 || newIndex < 0) return list;
    const next = [...list];
    const [item] = next.splice(oldIndex, 1);
    if (!item) return list;
    next.splice(newIndex, 0, item);
    return next;
  }
  return list.map((c) => {
    if (c.id === parentId && c.children) {
      const oldIndex = c.children.findIndex((x) => x.id === activeId);
      const newIndex = c.children.findIndex((x) => x.id === overId);
      if (oldIndex < 0 || newIndex < 0) return c;
      const kids = [...c.children];
      const [item] = kids.splice(oldIndex, 1);
      if (!item) return c;
      kids.splice(newIndex, 0, item);
      return { ...c, children: kids };
    }
    if (c.children?.length) {
      return {
        ...c,
        children: reorderSiblings(c.children, parentId, activeId, overId),
      };
    }
    return c;
  });
}

export function findParentId(
  list: PopupComponent[],
  childId: string,
): string | null {
  for (const c of list) {
    if (c.children?.some((x) => x.id === childId)) return c.id;
    if (c.children?.length) {
      const hit = findParentId(c.children, childId);
      if (hit) return hit;
    }
  }
  return null;
}
