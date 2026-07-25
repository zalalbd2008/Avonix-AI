"use client";

import type { ReactNode } from "react";
import type {
  FormTrustBadge,
  FormTrustConfig,
  FormTrustLogo,
  FormTrustTestimonial,
} from "@/lib/db/schema";
import {
  DEFAULT_TRUST,
  newTrustId,
  normalizeTrust,
} from "@/lib/forms/trust";

/**
 * Trust strip editor — logos, testimonials, ratings, badges, GDPR.
 */
export function TrustEditor({
  value,
  onChange,
}: {
  value: FormTrustConfig;
  onChange: (next: FormTrustConfig) => void;
}) {
  const trust = normalizeTrust(value);

  function patch(partial: Partial<FormTrustConfig>) {
    onChange(normalizeTrust({ ...trust, ...partial }));
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#edf0f5] bg-[#f8fafc] p-3">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
        Trust section
      </p>
      <p className="text-[12px] leading-relaxed text-muted">
        Logos, testimonials, ratings, security badges, and GDPR / privacy copy
        around the form.
      </p>

      <label className="flex items-center gap-2 text-[12.5px] text-muted">
        <input
          type="checkbox"
          checked={Boolean(trust.enabled)}
          onChange={(e) => {
            if (e.target.checked && !value.enabled) {
              patch({ ...DEFAULT_TRUST, enabled: true });
            } else {
              patch({ enabled: e.target.checked });
            }
          }}
        />
        Show trust section
      </label>

      {trust.enabled ? (
        <>
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-semibold text-muted">
              Placement
            </span>
            <select
              value={trust.placement ?? "below"}
              onChange={(e) =>
                patch({
                  placement: e.target.value as FormTrustConfig["placement"],
                })
              }
              className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            >
              <option value="above">Above form</option>
              <option value="below">Below form</option>
              <option value="both">Above &amp; below</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-semibold text-muted">
              Title
            </span>
            <input
              value={trust.title ?? ""}
              onChange={(e) => patch({ title: e.target.value })}
              className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                Rating
              </span>
              <input
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={trust.rating?.value ?? 0}
                onChange={(e) =>
                  patch({
                    rating: {
                      ...trust.rating,
                      value: Number(e.target.value),
                    },
                  })
                }
                className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                Review count
              </span>
              <input
                type="number"
                min={0}
                value={trust.rating?.count ?? 0}
                onChange={(e) =>
                  patch({
                    rating: {
                      ...trust.rating,
                      value: trust.rating?.value ?? 0,
                      count: Number(e.target.value),
                    },
                  })
                }
                className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
              />
            </label>
          </div>

          <ListBlock
            title="Client logos"
            onAdd={() => {
              const logo: FormTrustLogo = {
                id: newTrustId("logo"),
                name: "Client",
              };
              patch({ logos: [...(trust.logos ?? []), logo] });
            }}
          >
            {(trust.logos ?? []).map((logo) => (
              <div
                key={logo.id}
                className="rounded-lg border border-[#e6e9f0] bg-white p-2"
              >
                <input
                  value={logo.name}
                  onChange={(e) =>
                    patch({
                      logos: (trust.logos ?? []).map((l) =>
                        l.id === logo.id ? { ...l, name: e.target.value } : l,
                      ),
                    })
                  }
                  placeholder="Name"
                  className="mb-1 w-full rounded-md border border-[#dbe1ea] px-2 py-1.5 text-[12.5px]"
                />
                <input
                  value={logo.imageUrl ?? ""}
                  onChange={(e) =>
                    patch({
                      logos: (trust.logos ?? []).map((l) =>
                        l.id === logo.id
                          ? { ...l, imageUrl: e.target.value }
                          : l,
                      ),
                    })
                  }
                  placeholder="Image URL (optional)"
                  className="mb-1 w-full rounded-md border border-[#dbe1ea] px-2 py-1.5 text-[12.5px]"
                />
                <button
                  type="button"
                  onClick={() =>
                    patch({
                      logos: (trust.logos ?? []).filter((l) => l.id !== logo.id),
                    })
                  }
                  className="text-[11px] font-semibold text-bad"
                >
                  Remove
                </button>
              </div>
            ))}
          </ListBlock>

          <ListBlock
            title="Testimonials"
            onAdd={() => {
              const t: FormTrustTestimonial = {
                id: newTrustId("t"),
                quote: "Great experience.",
                author: "Alex",
                rating: 5,
              };
              patch({ testimonials: [...(trust.testimonials ?? []), t] });
            }}
          >
            {(trust.testimonials ?? []).map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-[#e6e9f0] bg-white p-2"
              >
                <textarea
                  rows={2}
                  value={t.quote}
                  onChange={(e) =>
                    patch({
                      testimonials: (trust.testimonials ?? []).map((x) =>
                        x.id === t.id ? { ...x, quote: e.target.value } : x,
                      ),
                    })
                  }
                  className="mb-1 w-full rounded-md border border-[#dbe1ea] px-2 py-1.5 text-[12.5px]"
                />
                <div className="mb-1 grid grid-cols-2 gap-1">
                  <input
                    value={t.author}
                    onChange={(e) =>
                      patch({
                        testimonials: (trust.testimonials ?? []).map((x) =>
                          x.id === t.id ? { ...x, author: e.target.value } : x,
                        ),
                      })
                    }
                    placeholder="Author"
                    className="rounded-md border border-[#dbe1ea] px-2 py-1.5 text-[12.5px]"
                  />
                  <input
                    value={t.role ?? ""}
                    onChange={(e) =>
                      patch({
                        testimonials: (trust.testimonials ?? []).map((x) =>
                          x.id === t.id ? { ...x, role: e.target.value } : x,
                        ),
                      })
                    }
                    placeholder="Role"
                    className="rounded-md border border-[#dbe1ea] px-2 py-1.5 text-[12.5px]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    patch({
                      testimonials: (trust.testimonials ?? []).filter(
                        (x) => x.id !== t.id,
                      ),
                    })
                  }
                  className="text-[11px] font-semibold text-bad"
                >
                  Remove
                </button>
              </div>
            ))}
          </ListBlock>

          <ListBlock
            title="Security badges"
            onAdd={() => {
              const b: FormTrustBadge = {
                id: newTrustId("b"),
                label: "Secure",
                icon: "🔒",
              };
              patch({ badges: [...(trust.badges ?? []), b] });
            }}
          >
            {(trust.badges ?? []).map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-1.5 rounded-lg border border-[#e6e9f0] bg-white p-2"
              >
                <input
                  value={b.icon ?? ""}
                  onChange={(e) =>
                    patch({
                      badges: (trust.badges ?? []).map((x) =>
                        x.id === b.id ? { ...x, icon: e.target.value } : x,
                      ),
                    })
                  }
                  className="w-12 rounded-md border border-[#dbe1ea] px-1.5 py-1.5 text-center text-[12.5px]"
                />
                <input
                  value={b.label}
                  onChange={(e) =>
                    patch({
                      badges: (trust.badges ?? []).map((x) =>
                        x.id === b.id ? { ...x, label: e.target.value } : x,
                      ),
                    })
                  }
                  className="min-w-0 flex-1 rounded-md border border-[#dbe1ea] px-2 py-1.5 text-[12.5px]"
                />
                <button
                  type="button"
                  onClick={() =>
                    patch({
                      badges: (trust.badges ?? []).filter((x) => x.id !== b.id),
                    })
                  }
                  className="text-[11px] font-semibold text-bad"
                >
                  ✕
                </button>
              </div>
            ))}
          </ListBlock>

          <label className="block">
            <span className="mb-1 block text-[11.5px] font-semibold text-muted">
              Privacy summary
            </span>
            <textarea
              rows={2}
              value={trust.privacySummary ?? ""}
              onChange={(e) => patch({ privacySummary: e.target.value })}
              className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-semibold text-muted">
              Privacy policy URL
            </span>
            <input
              type="url"
              value={trust.privacyUrl ?? ""}
              onChange={(e) => patch({ privacyUrl: e.target.value })}
              placeholder="https://…"
              className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-semibold text-muted">
              GDPR notice
            </span>
            <textarea
              rows={3}
              value={trust.gdprNotice ?? ""}
              onChange={(e) => patch({ gdprNotice: e.target.value })}
              className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
          </label>
        </>
      ) : null}
    </div>
  );
}

function ListBlock({
  title,
  onAdd,
  children,
}: {
  title: string;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-[#edf0f5] pt-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
          {title}
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-md border border-[#dbe1ea] px-2 py-1 text-[11.5px] font-semibold text-muted hover:border-brand hover:text-brand"
        >
          + Add
        </button>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}
