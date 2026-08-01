"use client";

import {
  WIDGET_PAGE_SURFACES,
  normalizeWidgetPageTarget,
  pathsTextToRules,
  rulesToPathsText,
  type WidgetPageTarget,
} from "@/lib/widgets/page-target";

const input =
  "w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[13px] text-ink outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/15";

/**
 * Show / hide floating widgets on WP surfaces and custom URLs.
 */
export function PageDisplayConditions({
  value,
  onChange,
  label = "Display conditions",
}: {
  value?: WidgetPageTarget | null;
  onChange: (next: WidgetPageTarget) => void;
  label?: string;
}) {
  const t = normalizeWidgetPageTarget(value);
  const customText = rulesToPathsText(t.rules);

  function patch(partial: Partial<WidgetPageTarget>) {
    onChange(normalizeWidgetPageTarget({ ...t, ...partial }));
  }

  return (
    <div className="space-y-3 rounded-xl border border-line bg-[#fafbfc] p-3">
      <p className="text-[12px] font-semibold text-ink">{label}</p>
      <p className="text-[12px] text-muted">
        Control which pages show this widget. Custom URLs and post types work
        together with the mode below.
      </p>
      <div className="flex flex-col gap-2">
        {(
          [
            {
              id: "everywhere" as const,
              title: "Everywhere",
              hint: "Show on all pages (except always-hide list)",
            },
            {
              id: "exclude" as const,
              title: "Hide on selected",
              hint: "Hide on checked surfaces / custom URLs",
            },
            {
              id: "include" as const,
              title: "Only on selected",
              hint: "Show only on checked surfaces / custom URLs",
            },
          ] as const
        ).map((opt) => (
          <label
            key={opt.id}
            className="flex cursor-pointer items-start gap-2 text-[12px]"
          >
            <input
              type="radio"
              className="mt-0.5"
              name={`page-target-${label}`}
              checked={t.mode === opt.id}
              onChange={() => patch({ mode: opt.id })}
            />
            <span>
              <span className="font-medium text-ink">{opt.title}</span>
              <span className="mt-0.5 block text-muted">{opt.hint}</span>
            </span>
          </label>
        ))}
      </div>

      {t.mode !== "everywhere" ? (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Page types
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {WIDGET_PAGE_SURFACES.map((s) => {
              const on = (t.surfaces ?? []).includes(s.value);
              return (
                <label
                  key={s.value}
                  className="flex items-center gap-1.5 text-[12px] text-ink"
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => {
                      const set = new Set(t.surfaces ?? []);
                      if (on) set.delete(s.value);
                      else set.add(s.value);
                      patch({ surfaces: [...set] });
                    }}
                  />
                  {s.label}
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      {t.mode !== "everywhere" ? (
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
            Custom URLs / paths (one per line)
          </span>
          <textarea
            className={`${input} min-h-[88px] font-mono text-[12px]`}
            placeholder={"/services\n/blog/*\nhttps://yoursite.com/contact"}
            value={customText}
            onChange={(e) => patch({ rules: pathsTextToRules(e.target.value) })}
          />
          <span className="mt-1 block text-[11px] text-faint">
            Use <code className="text-[10px]">/path/*</code> for prefixes. Full
            URLs are OK — pathname is used.
          </span>
        </label>
      ) : null}

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
          Always hide on these paths (one per line)
        </span>
        <textarea
          className={`${input} min-h-[64px] font-mono text-[12px]`}
          placeholder={"/checkout\n/wp-admin"}
          value={(t.excludePaths ?? []).join("\n")}
          onChange={(e) =>
            patch({
              excludePaths: e.target.value
                .split(/\r?\n/)
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </label>
    </div>
  );
}
