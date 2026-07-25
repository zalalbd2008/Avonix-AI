"use client";

import { useMemo, useState } from "react";
import type { FormAppointmentConfig } from "@/lib/db/schema";
import {
  WEEKDAY_LABELS,
  addDays,
  formatAppointmentSummary,
  formatSlotLabel,
  isDateBookable,
  parseAppointmentValue,
  resolveAppointmentConfig,
  serializeAppointmentValue,
  startOfDay,
  timezoneOptions,
  toDateKey,
  detectTimezone,
} from "@/lib/forms/appointment-config";

/**
 * Calendar + time-slot picker with optional timezone (auto-detect).
 */
export function AppointmentPicker({
  label,
  required,
  appointmentConfig,
  value,
  showLabel = true,
  onChange,
}: {
  label: string;
  required?: boolean;
  appointmentConfig?: FormAppointmentConfig | null;
  value?: string;
  showLabel?: boolean;
  onChange: (next: string) => void;
}) {
  const cfg = resolveAppointmentConfig(appointmentConfig);
  const parsed = parseAppointmentValue(value);
  const detectedTz = useMemo(() => detectTimezone(), []);
  const tzList = useMemo(
    () => timezoneOptions(parsed?.timezone || detectedTz),
    [parsed?.timezone, detectedTz],
  );

  const today = useMemo(() => startOfDay(new Date()), []);
  const [cursor, setCursor] = useState(() => {
    if (parsed?.date) {
      const [y, m] = parsed.date.split("-").map(Number);
      return new Date(y!, m! - 1, 1);
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const selectedDate =
    parsed?.date ||
    (value && /^\d{4}-\d{2}-\d{2}\|/.test(value) ? value.split("|")[0]! : "");
  const selectedTime = parsed?.time ?? "";
  const selectedTz =
    parsed?.timezone || (cfg.showTimezone ? detectedTz : undefined);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toDateKey(new Date(year, month, d)));
  }

  const summary = formatAppointmentSummary(
    selectedDate && selectedTime
      ? serializeAppointmentValue({
          date: selectedDate,
          time: selectedTime,
          timezone: cfg.showTimezone ? selectedTz : undefined,
        })
      : "",
  );

  return (
    <div className="flex flex-col gap-2.5">
      {showLabel ? (
        <div
          className="font-semibold"
          style={{
            color: "var(--avx-label)",
            fontSize: "var(--avx-label-size)",
          }}
        >
          {label}
          {required ? (
            <span style={{ color: "var(--avx-required)" }}> *</span>
          ) : null}
        </div>
      ) : null}

      <div
        className="rounded-[10px] border p-3"
        style={{
          borderColor: "var(--avx-input-border, #dbe1ea)",
          background: "var(--avx-input-bg, #fff)",
        }}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <button
            type="button"
            className="rounded-md px-2 py-1 text-[13px] font-semibold text-muted hover:bg-[#f1f4f8]"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className="text-[13px] font-bold text-ink">
            {cursor.toLocaleString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-[13px] font-semibold text-muted hover:bg-[#f1f4f8]"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold tracking-wide text-faint uppercase">
          {WEEKDAY_LABELS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((key, i) => {
            if (!key) return <span key={`e-${i}`} />;
            const bookable = isDateBookable(key, cfg, today);
            const active = key === selectedDate;
            const isToday = key === toDateKey(today);
            return (
              <button
                key={key}
                type="button"
                disabled={!bookable}
                onClick={() => {
                  if (!isDateBookable(key, cfg, today)) return;
                  const nextTime =
                    selectedTime && cfg.slots.includes(selectedTime)
                      ? selectedTime
                      : "";
                  if (nextTime) {
                    onChange(
                      serializeAppointmentValue({
                        date: key,
                        time: nextTime,
                        timezone: cfg.showTimezone ? selectedTz : undefined,
                      }),
                    );
                  } else {
                    onChange(`${key}|`);
                  }
                }}
                className={[
                  "aspect-square rounded-lg text-[12.5px] font-semibold transition-colors",
                  !bookable
                    ? "cursor-not-allowed text-[#c5ccd8]"
                    : active
                      ? "bg-brand text-white"
                      : isToday
                        ? "bg-[#fff8f3] text-brand hover:bg-brand/15"
                        : "text-ink hover:bg-[#f1f4f8]",
                ].join(" ")}
              >
                {Number(key.slice(-2))}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[11.5px] font-semibold text-muted">
          Time slot
          <span className="ml-1 font-normal text-faint">
            · {cfg.slotDurationMin} min
          </span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {cfg.slots.map((slot) => {
            const active = slot === selectedTime && Boolean(selectedDate);
            const disabled = !selectedDate;
            return (
              <button
                key={slot}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (!selectedDate) return;
                  onChange(
                    serializeAppointmentValue({
                      date: selectedDate,
                      time: slot,
                      timezone: cfg.showTimezone ? selectedTz : undefined,
                    }),
                  );
                }}
                className={[
                  "rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition-colors",
                  disabled
                    ? "cursor-not-allowed border-[#edf0f5] text-[#c5ccd8]"
                    : active
                      ? "border-brand bg-brand text-white"
                      : "border-[#dbe1ea] text-ink hover:border-brand",
                ].join(" ")}
              >
                {formatSlotLabel(slot)}
              </button>
            );
          })}
        </div>
      </div>

      {cfg.showTimezone ? (
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-semibold text-muted">
            Time zone
          </span>
          <select
            value={selectedTz || detectedTz}
            onChange={(e) => {
              if (selectedDate && selectedTime) {
                onChange(
                  serializeAppointmentValue({
                    date: selectedDate,
                    time: selectedTime,
                    timezone: e.target.value,
                  }),
                );
              }
            }}
            className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
          >
            {tzList.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {summary ? (
        <p className="rounded-lg bg-[#fff8f3] px-3 py-2 text-[12.5px] font-semibold text-brand">
          {summary}
        </p>
      ) : (
        <p className="text-[12px] text-faint">
          Pick a date
          {cfg.minDaysFromToday > 0
            ? ` (from ${addDays(today, cfg.minDaysFromToday).toLocaleDateString()})`
            : ""}
          , then a time slot
          {cfg.showTimezone ? " — timezone auto-detected" : ""}.
        </p>
      )}
    </div>
  );
}
