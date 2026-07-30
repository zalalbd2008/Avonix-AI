"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { SetupBadge, type SetupBadgeKind } from "@/components/ui/setup-badge";
import { actionSaveAutomation } from "@/lib/automation/actions";
import { actionConnectTelegramPhone } from "@/lib/integrations/actions";
import {
  AUTOMATION_ACTIONS,
  AUTOMATION_TRIGGERS,
  SOCIAL_PROVIDERS,
  WORKFLOW_PRESETS,
  actionMeta,
  automationConfigScore,
  automationStatusLabel,
  connectedSocialCount,
  emptySocialAccount,
  mergeAutomationSettings,
  mergeSocialAccount,
  needsSocialTargets,
  newAutomationRule,
  socialProviderMeta,
  triggerMeta,
  type AutomationAction,
  type AutomationRule,
  type AutomationSettings,
  type SocialAccount,
  type SocialProvider,
  type WorkflowKind,
} from "@/lib/automation/types";

const input =
  "w-full rounded-lg border-2 border-[#dce8f5] bg-white px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

export function AutomationStudio({
  clientId,
  websiteId,
  websiteName,
  websiteUrl,
  initial,
}: {
  clientId: string;
  websiteId: string;
  websiteName: string;
  websiteUrl: string;
  initial?: Partial<AutomationSettings> | null;
}) {
  const [settings, setSettings] = useState(() =>
    mergeAutomationSettings(initial),
  );
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSocial, setEditingSocial] = useState<SocialProvider | null>(
    null,
  );

  const score = useMemo(() => automationConfigScore(settings), [settings]);
  const status = useMemo(() => automationStatusLabel(settings), [settings]);
  const activeCount = settings.rules.filter((r) => r.enabled).length;
  const socialCount = connectedSocialCount(settings);
  const smtpHref = `/clients/${clientId}/websites/${websiteId}/email`;
  const inboxHref = `/clients/${clientId}/websites/${websiteId}/conversations`;

  function patch(partial: Partial<AutomationSettings>) {
    setSettings((s) => mergeAutomationSettings({ ...s, ...partial }));
    setSaved(false);
    setError(null);
  }

  function patchRule(id: string, partial: Partial<AutomationRule>) {
    patch({
      rules: settings.rules.map((r) =>
        r.id === id ? newAutomationRule({ ...r, ...partial }) : r,
      ),
    });
  }

  function patchSocial(provider: SocialProvider, partial: Partial<SocialAccount>) {
    patch({
      socialAccounts: settings.socialAccounts.map((a) =>
        a.provider === provider
          ? mergeSocialAccount({ ...a, ...partial, provider })
          : a,
      ),
    });
  }

  function connectSocial(provider: SocialProvider) {
    if (provider === "telegram") {
      startTransition(async () => {
        const account =
          settings.socialAccounts.find((a) => a.provider === "telegram") ??
          emptySocialAccount("telegram");
        const res = await actionConnectTelegramPhone({
          websiteId,
          clientId,
          phone: account.accountId,
          label: account.label,
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        window.open(res.deepLink, "_blank", "noopener,noreferrer");
        setError(null);
        setEditingSocial(null);
      });
      return;
    }
    const account =
      settings.socialAccounts.find((a) => a.provider === provider) ??
      emptySocialAccount(provider);
    if (!account.accountId.trim() || !account.accessToken.trim()) {
      setError(
        `Add ${socialProviderMeta(provider).idLabel} and token for ${socialProviderMeta(provider).label}.`,
      );
      setEditingSocial(provider);
      return;
    }
    patchSocial(provider, {
      connected: true,
      connectedAt: new Date().toISOString(),
    });
    setEditingSocial(null);
  }

  function disconnectSocial(provider: SocialProvider) {
    patchSocial(provider, {
      connected: false,
      accessToken: "",
      connectedAt: "",
    });
    setEditingSocial(null);
  }

  function addRule() {
    patch({
      rules: [
        ...settings.rules,
        newAutomationRule({
          name: `Rule ${settings.rules.length + 1}`,
          trigger: "form_submit",
          actions: ["thank_you_email", "notify_email", "save_crm", "score_lead"],
        }),
      ],
    });
  }

  function addWorkflowPreset(kind: WorkflowKind) {
    if (kind === "custom") return;
    const preset = WORKFLOW_PRESETS.find((p) => p.id === kind);
    if (!preset) return;
    patch({
      rules: [
        ...settings.rules,
        newAutomationRule({
          ...preset.rule,
          name: `${preset.rule.name ?? preset.label} ${settings.rules.length + 1}`,
        }),
      ],
    });
  }

  function removeRule(id: string) {
    patch({ rules: settings.rules.filter((r) => r.id !== id) });
  }

  function toggleAction(rule: AutomationRule, action: AutomationAction) {
    const has = rule.actions.includes(action);
    const actions = has
      ? rule.actions.filter((a) => a !== action)
      : [...rule.actions, action];
    patchRule(rule.id, {
      actions: actions.length ? actions : [action],
    });
  }

  function save() {
    startTransition(async () => {
      const res = await actionSaveAutomation({
        websiteId,
        clientId,
        settings,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    });
  }

  return (
    <div>
      <PageHeader
        title="Auto Rules"
        subtitle={`When something happens on ${websiteName}, do this next`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {saved ? (
              <span className="text-[12px] font-semibold text-ok">Saved</span>
            ) : null}
            {error ? (
              <span className="max-w-[260px] text-[12px] font-medium text-bad">
                {error}
              </span>
            ) : null}
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                settings.enabled
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-[#eef2f7] text-faint"
              }`}
            >
              {settings.enabled ? "Running" : "Paused"}
            </span>
            <button
              type="button"
              onClick={addRule}
              className="rounded-lg border-2 border-sky-200 bg-sky-50 px-3 py-2 text-[13px] font-semibold text-sky-800 hover:bg-sky-100"
            >
              + Add rule
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={save}
              className="rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save rules"}
            </button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Metric
          value={status.label}
          label="Status"
          tone={status.tone}
          accent="from-emerald-400/20"
          badge={
            status.label === "Off" || status.label === "No rules on"
              ? "setup"
              : undefined
          }
        />
        <Metric
          value={String(settings.rules.length)}
          label="Total rules"
          tone="text-ink"
          accent="from-sky-400/20"
          badge={settings.rules.length === 0 ? "setup" : undefined}
        />
        <Metric
          value={String(activeCount)}
          label="Turned on"
          tone={activeCount ? "text-ok" : "text-muted"}
          accent="from-amber-400/20"
          badge={
            settings.enabled && activeCount === 0 ? "incomplete" : undefined
          }
        />
        <Metric
          value={String(socialCount)}
          label="Social linked"
          tone={socialCount ? "text-ok" : "text-muted"}
          accent="from-pink-400/20"
          badge={socialCount === 0 ? "connect" : undefined}
        />
        <Metric
          value={`${score}%`}
          label="Ready"
          tone={
            score >= 70 ? "text-ok" : score >= 40 ? "text-warn" : "text-muted"
          }
          accent="from-rose-400/20"
          badge={score < 40 ? "setup" : score < 70 ? "incomplete" : undefined}
        />
      </div>

      <div
        className={`mb-4 flex items-start gap-2.5 rounded-xl border-2 px-4 py-3 text-[13px] ${
          settings.enabled
            ? "border-emerald-200 bg-gradient-to-r from-emerald-50 to-sky-50"
            : "border-line bg-[#f8fafc]"
        }`}
      >
        <span
          className={`mt-1.5 size-2.5 shrink-0 rounded-full ${
            settings.enabled ? "bg-emerald-500" : "bg-[#c9d2de]"
          }`}
        />
        <div className="min-w-0">
          {settings.enabled ? (
            <p>
              <b className="font-semibold text-ink">Rules are live.</b>{" "}
              <span className="text-muted">
                Email alerts use{" "}
                <Link
                  href={smtpHref as never}
                  className="font-semibold text-brand hover:underline"
                >
                  SMTP Setup
                </Link>
                . Chat follow-ups show in{" "}
                <Link
                  href={inboxHref as never}
                  className="font-semibold text-brand hover:underline"
                >
                  Conversations
                </Link>
                . Social posts need a linked account below. Rules run live on
                form submit and chat handoff.
              </span>
            </p>
          ) : (
            <p>
              <b className="font-semibold text-ink">Rules are paused.</b>{" "}
              <span className="text-muted">
                Link social accounts, build “if this → then that” for{" "}
                <span className="font-mono text-[12px] text-ink">
                  {websiteUrl}
                </span>
                , then turn Auto Rules on and save.
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <Section
            title="Master switch"
            subtitle="One toggle for every rule on this website"
            accent="border-l-4 border-l-emerald-400"
          >
            <Toggle
              label="Turn Auto Rules on"
              description="Off = nothing fires, even if individual rules are on"
              checked={settings.enabled}
              onChange={(enabled) => patch({ enabled })}
              color="emerald"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Default alert email" color="orange">
                <input
                  className={input}
                  type="email"
                  value={settings.defaultNotifyEmail}
                  placeholder="team@agency.com"
                  onChange={(e) =>
                    patch({ defaultNotifyEmail: e.target.value })
                  }
                />
              </Field>
              <Field label="Default webhook URL" color="cyan">
                <input
                  className={input}
                  value={settings.defaultWebhookUrl}
                  placeholder="https://hooks.zapier.com/…"
                  onChange={(e) =>
                    patch({ defaultWebhookUrl: e.target.value })
                  }
                />
              </Field>
              <Field label="Missed chat wait (minutes)" color="rose">
                <input
                  className={input}
                  type="number"
                  min={5}
                  max={240}
                  value={settings.missedChatMinutes}
                  onChange={(e) =>
                    patch({
                      missedChatMinutes: Number(e.target.value) || 15,
                    })
                  }
                />
              </Field>
            </div>
            <p className="text-[12px] text-muted">
              Leave blank to use SMTP Setup’s notify address. Per-rule values
              override these defaults.
            </p>
          </Section>

          <Section
            title="Workflow templates"
            subtitle="One-click starters — Contact, Quote, Appointment"
            accent="border-l-4 border-l-amber-400"
          >
            <div className="grid gap-2 sm:grid-cols-3">
              {WORKFLOW_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addWorkflowPreset(p.id)}
                  className={`rounded-xl border-2 px-3 py-3 text-left transition hover:brightness-95 ${p.tone}`}
                >
                  <span className="block text-[13px] font-bold">{p.label}</span>
                  <span className="mt-0.5 block text-[11px] opacity-80">
                    {p.hint}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[12px] text-muted">
              Templates include AI decide, thank-you, CRM, and open/no-open
              follow-up. Hit Save after adding.
            </p>
          </Section>

          <Section
            title="Social accounts"
            subtitle="Connect pages & messaging — then use them in rules"
            accent="border-l-4 border-l-pink-400"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {SOCIAL_PROVIDERS.map((meta) => {
                const account =
                  settings.socialAccounts.find((a) => a.provider === meta.id) ??
                  emptySocialAccount(meta.id);
                const open = editingSocial === meta.id || account.connected;
                return (
                  <div
                    key={meta.id}
                    className={`overflow-hidden rounded-xl border-2 bg-gradient-to-br ${meta.bar} to-white ${
                      account.connected
                        ? `${meta.tone.split(" ").find((c) => c.startsWith("border-")) ?? "border-emerald-200"}`
                        : "border-[#e8edf5]"
                    }`}
                  >
                    <div className="flex items-start gap-2 px-3 pt-3">
                      <span
                        className={`rounded-lg border px-2 py-1 text-[11px] font-bold ${meta.tone}`}
                      >
                        {meta.label}
                      </span>
                      <span
                        className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          account.connected
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-[#eef2f7]"
                        }`}
                      >
                        {account.connected ? (
                          "Linked"
                        ) : (
                          <SetupBadge kind="connect" />
                        )}
                      </span>
                    </div>
                    <p className="px-3 pt-1.5 text-[11.5px] text-muted">
                      {meta.hint}
                    </p>

                    {open ? (
                      <div className="space-y-2.5 px-3 py-3">
                        <Field label="Display name" color="sky">
                          <input
                            className={input}
                            value={account.label}
                            placeholder={`${meta.label} page`}
                            onChange={(e) =>
                              patchSocial(meta.id, { label: e.target.value })
                            }
                          />
                        </Field>
                        <Field label={meta.idLabel} color="cyan">
                          <input
                            className={input}
                            value={account.accountId}
                            placeholder={meta.idPlaceholder}
                            onChange={(e) =>
                              patchSocial(meta.id, {
                                accountId: e.target.value,
                                connected: false,
                              })
                            }
                          />
                        </Field>
                        {meta.id !== "telegram" ? (
                          <Field label={meta.tokenLabel} color="rose">
                            <input
                              className={input}
                              type="password"
                              autoComplete="off"
                              value={account.accessToken}
                              placeholder="Paste token"
                              onChange={(e) =>
                                patchSocial(meta.id, {
                                  accessToken: e.target.value,
                                  connected: false,
                                })
                              }
                            />
                          </Field>
                        ) : (
                          <p className="text-[11.5px] text-muted">
                            Enter phone, then Connect — Telegram opens once to
                            confirm. Platform bot handles the rest.
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {account.connected ? (
                            <button
                              type="button"
                              onClick={() => disconnectSocial(meta.id)}
                              className="rounded-lg border-2 border-rose-200 bg-rose-50 px-3 py-1.5 text-[12px] font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              Disconnect
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => connectSocial(meta.id)}
                              className={`rounded-lg border-2 px-3 py-1.5 text-[12px] font-semibold ${meta.tone} hover:brightness-95`}
                            >
                              Connect {meta.label}
                            </button>
                          )}
                          {!account.connected && editingSocial === meta.id ? (
                            <button
                              type="button"
                              onClick={() => setEditingSocial(null)}
                              className="rounded-lg px-2 py-1.5 text-[12px] font-semibold text-muted hover:bg-[#f1f5f9]"
                            >
                              Cancel
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => setEditingSocial(meta.id)}
                          className={`w-full rounded-lg border-2 px-3 py-2 text-[12.5px] font-semibold ${meta.tone} hover:brightness-95`}
                        >
                          + Connect {meta.label}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[12px] text-muted">
              Tokens stay on this website’s settings. Delivery runs when the
              social worker is online — same idea as webhooks.
            </p>
          </Section>

          {settings.rules.length === 0 ? (
            <section className="rounded-xl border-2 border-dashed border-sky-200 bg-gradient-to-br from-sky-50 via-white to-amber-50 px-6 py-14 text-center">
              <p className="text-[15px] font-bold text-ink">No rules yet</p>
              <p className="mx-auto mt-1.5 max-w-md text-[13px] text-muted">
                Example: form filled → thank-you email + team alert + CRM save +
                lead score. Add WhatsApp when the account is linked.
              </p>
              <button
                type="button"
                onClick={addRule}
                className="mt-5 rounded-lg bg-sky-600 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-sky-700"
              >
                + Create first rule
              </button>
            </section>
          ) : (
            settings.rules.map((rule, index) => (
              <RuleCard
                key={rule.id}
                index={index}
                rule={rule}
                socialAccounts={settings.socialAccounts}
                onChange={(partial) => patchRule(rule.id, partial)}
                onToggleAction={(action) => toggleAction(rule, action)}
                onRemove={() => removeRule(rule.id)}
              />
            ))
          )}
        </div>

        <aside className="space-y-4">
          <section className="overflow-hidden rounded-xl border border-line bg-white">
            <h2 className="border-b border-[#edf0f5] bg-gradient-to-r from-pink-50 to-sky-50 px-4 py-3 text-sm font-semibold">
              Quick tips
            </h2>
            <ul className="space-y-2.5 px-4 py-4 text-[12.5px] text-muted">
              <li>
                <b className="text-ink">Connect social</b> first, then pick it
                in a rule action.
              </li>
              <li>
                <b className="text-ink">Trigger</b> = what starts the rule.
              </li>
              <li>
                <b className="text-ink">Action</b> = email, webhook, or social
                post / reply.
              </li>
              <li>
                <b className="text-ink">Follow-up later</b> waits, then sends
                offer if email opened — else reminder.
              </li>
              <li>
                <b className="text-ink">Assign sales</b> routes hot budget/score
                leads to an owner.
              </li>
              <li>
                Cron:{" "}
                <code className="text-[11px]">/api/cron/automation</code> with{" "}
                <code className="text-[11px]">CRON_SECRET</code>.
              </li>
              <li>
                Site-down rules need{" "}
                <Link
                  href={
                    `/clients/${clientId}/websites/${websiteId}/uptime` as never
                  }
                  className="font-semibold text-brand hover:underline"
                >
                  Uptime
                </Link>{" "}
                turned on.
              </li>
            </ul>
          </section>

          <section className="overflow-hidden rounded-xl border border-line bg-white">
            <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">
              Trigger colors
            </h2>
            <ul className="max-h-[420px] space-y-2 overflow-y-auto px-3 py-3">
              {AUTOMATION_TRIGGERS.map((t) => (
                <li
                  key={t.id}
                  className={`rounded-lg border px-2.5 py-2 text-[12px] ${t.tone}`}
                >
                  <span className="font-semibold">{t.label}</span>
                  <span className="mt-0.5 block opacity-80">{t.hint}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function RuleCard({
  index,
  rule,
  socialAccounts,
  onChange,
  onToggleAction,
  onRemove,
}: {
  index: number;
  rule: AutomationRule;
  socialAccounts: SocialAccount[];
  onChange: (partial: Partial<AutomationRule>) => void;
  onToggleAction: (action: AutomationAction) => void;
  onRemove: () => void;
}) {
  const trigger = triggerMeta(rule.trigger);
  const showSocial = needsSocialTargets(rule.actions);
  const showThankYou = rule.actions.includes("thank_you_email");
  const showFollowUp = rule.actions.includes("schedule_follow_up");
  const showSales = rule.actions.includes("assign_sales");
  const showSms = rule.actions.includes("notify_sms");
  const showMessage =
    showSocial ||
    showThankYou ||
    rule.actions.includes("notify_whatsapp") ||
    showFollowUp ||
    showSms;
  const connected = socialAccounts.filter((a) => a.connected);

  function toggleTarget(provider: SocialProvider) {
    const has = rule.socialTargets.includes(provider);
    onChange({
      socialTargets: has
        ? rule.socialTargets.filter((p) => p !== provider)
        : [...rule.socialTargets, provider],
    });
  }

  return (
    <section
      className={`overflow-hidden rounded-xl border-2 bg-white shadow-sm ${
        rule.enabled ? "border-sky-200" : "border-[#e8edf5] opacity-90"
      }`}
    >
      <div
        className={`flex flex-wrap items-center gap-2 border-b px-4 py-3 ${
          rule.enabled
            ? "border-sky-100 bg-gradient-to-r from-sky-50 to-emerald-50"
            : "border-[#edf0f5] bg-[#f8fafc]"
        }`}
      >
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold tracking-wide text-sky-700 uppercase">
          Rule {index + 1}
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${trigger.tone}`}
        >
          {trigger.label}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
            <input
              type="checkbox"
              checked={rule.enabled}
              onChange={(e) => onChange({ enabled: e.target.checked })}
            />
            On
          </label>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md px-2 py-1 text-[12px] font-semibold text-rose-600 hover:bg-rose-50"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        <Field label="Rule name" color="sky">
          <input
            className={input}
            value={rule.name}
            placeholder="e.g. Lead → WhatsApp + email"
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </Field>

        <Toggle
          label="AI decide"
          description="Reorder actions from intent / urgency / interest"
          checked={rule.aiDecide}
          onChange={(aiDecide) => onChange({ aiDecide })}
          color="sky"
        />

        <div>
          <p className="mb-2 text-[12px] font-semibold text-ink">
            When this happens
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {AUTOMATION_TRIGGERS.map((t) => {
              const on = rule.trigger === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onChange({ trigger: t.id })}
                  className={`rounded-xl border-2 px-3 py-2.5 text-left transition ${
                    on
                      ? `${t.tone} ring-2 ${t.ring}`
                      : "border-[#e8edf5] bg-white hover:border-sky-200"
                  }`}
                >
                  <span className="block text-[12.5px] font-bold">
                    {t.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] opacity-80">
                    {t.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[12px] font-semibold text-ink">Then do this</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {AUTOMATION_ACTIONS.map((a) => {
              const on = rule.actions.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onToggleAction(a.id)}
                  className={`rounded-xl border-2 px-3 py-2.5 text-left transition ${
                    on
                      ? `${a.tone} ring-2 ring-current/20`
                      : "border-[#e8edf5] bg-white hover:border-orange-200"
                  }`}
                >
                  <span className="flex items-center gap-2 text-[12.5px] font-bold">
                    <span
                      className={`grid size-4 place-items-center rounded border text-[10px] ${
                        on
                          ? "border-current bg-white/70"
                          : "border-[#cfd8e3] text-faint"
                      }`}
                    >
                      {on ? "✓" : ""}
                    </span>
                    {a.label}
                  </span>
                  <span className="mt-0.5 block pl-6 text-[11px] opacity-80">
                    {a.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {(rule.actions.includes("notify_email") ||
          rule.actions.includes("webhook") ||
          rule.actions.includes("tag_contact") ||
          showMessage ||
          showSales ||
          showSms) && (
          <div className="space-y-3 rounded-xl border border-[#eef2f7] bg-[#fbfcfe] p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {rule.actions.includes("notify_email") ? (
                <Field label="Alert email (optional)" color="orange">
                  <input
                    className={input}
                    type="email"
                    value={rule.notifyEmail}
                    placeholder="Leave blank = default"
                    onChange={(e) => onChange({ notifyEmail: e.target.value })}
                  />
                </Field>
              ) : null}
              {rule.actions.includes("webhook") ? (
                <Field label="Webhook URL (optional)" color="cyan">
                  <input
                    className={input}
                    value={rule.webhookUrl}
                    placeholder="Leave blank = default"
                    onChange={(e) => onChange({ webhookUrl: e.target.value })}
                  />
                </Field>
              ) : null}
              {rule.actions.includes("tag_contact") ? (
                <Field label="Tag name" color="lime">
                  <input
                    className={input}
                    value={rule.tag}
                    placeholder="e.g. hot-lead"
                    onChange={(e) => onChange({ tag: e.target.value })}
                  />
                </Field>
              ) : null}
            </div>

            {showSocial ? (
              <div className="space-y-3 border-t border-[#eef2f7] pt-3">
                {(rule.actions.includes("post_social") ||
                  rule.actions.includes("reply_social")) && (
                  <div>
                    <p className="mb-2 text-[12px] font-semibold text-ink">
                      Post / reply on
                    </p>
                    {connected.length === 0 ? (
                      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                        Connect at least one social account above first.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {connected.map((a) => {
                          const meta = socialProviderMeta(a.provider);
                          const on = rule.socialTargets.includes(a.provider);
                          const lockedWhatsappOnly =
                            rule.actions.includes("notify_whatsapp") &&
                            !rule.actions.includes("post_social") &&
                            !rule.actions.includes("reply_social");
                          if (lockedWhatsappOnly) return null;
                          return (
                            <button
                              key={a.provider}
                              type="button"
                              onClick={() => toggleTarget(a.provider)}
                              className={`rounded-lg border-2 px-2.5 py-1.5 text-[12px] font-semibold transition ${
                                on
                                  ? `${meta.tone} ring-2 ${meta.ring}`
                                  : "border-[#e8edf5] bg-white text-muted hover:border-pink-200"
                              }`}
                            >
                              {on ? "✓ " : ""}
                              {meta.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {rule.actions.includes("notify_whatsapp") &&
                !connected.some((a) => a.provider === "whatsapp") ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                    Connect WhatsApp above to send WhatsApp messages.
                  </p>
                ) : null}
              </div>
            ) : null}

            {showMessage ? (
              <Field
                label={
                  showThankYou && !showSocial
                    ? "Thank-you message (optional)"
                    : "Message template"
                }
                color="rose"
              >
                <textarea
                  className={`${input} min-h-[72px] resize-y`}
                  value={rule.socialMessage}
                  placeholder={
                    showThankYou
                      ? "Leave blank = AI writes from form fields. Or use {{name}} {{service}} {{city}}"
                      : "Hi {{name}} — thanks for reaching out! We’ll reply soon."
                  }
                  onChange={(e) => onChange({ socialMessage: e.target.value })}
                />
                <span className="mt-1 block text-[11px] text-muted">
                  Tokens: {"{{name}}"} {"{{service}}"} {"{{company}}"}{" "}
                  {"{{city}}"} {"{{category}}"} {"{{followUp}}"}
                </span>
              </Field>
            ) : null}

            {showFollowUp ? (
              <div className="space-y-3 border-t border-[#eef2f7] pt-3">
                <p className="text-[12px] font-semibold text-ink">
                  Dynamic follow-up
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Wait (hours)" color="orange">
                    <input
                      className={input}
                      type="number"
                      min={1}
                      max={720}
                      value={rule.followUpDelayHours}
                      onChange={(e) =>
                        onChange({
                          followUpDelayHours: Number(e.target.value) || 48,
                        })
                      }
                    />
                  </Field>
                </div>
                <Field label="If opened → offer" color="lime">
                  <textarea
                    className={`${input} min-h-[64px] resize-y`}
                    value={rule.followUpOfferMessage}
                    placeholder="Saw you opened our note — want a quick call?"
                    onChange={(e) =>
                      onChange({ followUpOfferMessage: e.target.value })
                    }
                  />
                </Field>
                <Field label="If not opened → reminder" color="rose">
                  <textarea
                    className={`${input} min-h-[64px] resize-y`}
                    value={rule.followUpReminderMessage}
                    placeholder="Just checking in on your request…"
                    onChange={(e) =>
                      onChange({ followUpReminderMessage: e.target.value })
                    }
                  />
                </Field>
              </div>
            ) : null}

            {showSales ? (
              <div className="grid gap-3 border-t border-[#eef2f7] pt-3 sm:grid-cols-2">
                <Field label="Sales owner" color="sky">
                  <input
                    className={input}
                    value={rule.assignee}
                    placeholder="Sales Manager"
                    onChange={(e) => onChange({ assignee: e.target.value })}
                  />
                </Field>
                <Field label="Sales notify email" color="orange">
                  <input
                    className={input}
                    type="email"
                    value={rule.salesNotifyEmail}
                    placeholder="Optional override"
                    onChange={(e) =>
                      onChange({ salesNotifyEmail: e.target.value })
                    }
                  />
                </Field>
                <Field label="Budget threshold" color="lime">
                  <input
                    className={input}
                    type="number"
                    min={0}
                    value={rule.budgetThreshold || ""}
                    placeholder="e.g. 5000 (0 = AI only)"
                    onChange={(e) =>
                      onChange({
                        budgetThreshold: Number(e.target.value) || 0,
                      })
                    }
                  />
                </Field>
                <Field label="Min lead score" color="cyan">
                  <input
                    className={input}
                    type="number"
                    min={0}
                    max={100}
                    value={rule.minScore || ""}
                    placeholder="e.g. 70"
                    onChange={(e) =>
                      onChange({ minScore: Number(e.target.value) || 0 })
                    }
                  />
                </Field>
              </div>
            ) : null}

            {showSms ? (
              <div className="grid gap-3 border-t border-[#eef2f7] pt-3 sm:grid-cols-2">
                <Field label="SMS to (optional)" color="sky">
                  <input
                    className={input}
                    value={rule.smsTo}
                    placeholder="Blank = visitor phone · +8801…"
                    onChange={(e) => onChange({ smsTo: e.target.value })}
                  />
                </Field>
              </div>
            ) : null}
          </div>
        )}

        <p className="text-[11.5px] text-muted">
          Actions:{" "}
          {rule.actions.map((a) => actionMeta(a).label).join(" · ") || "—"}
        </p>
      </div>
    </section>
  );
}

function Metric({
  value,
  label,
  tone = "text-ink",
  accent = "from-sky-400/15",
  badge,
}: {
  value: string;
  label: string;
  tone?: string;
  accent?: string;
  badge?: SetupBadgeKind;
}) {
  return (
    <div
      className={`rounded-[12px] border border-line bg-gradient-to-br ${accent} to-white px-4 pb-3.5 pt-4`}
    >
      <div
        className={`truncate text-2xl font-bold tracking-[-0.02em] ${badge ? "text-bad" : tone}`}
        title={value}
      >
        {badge ? <SetupBadge kind={badge} size="lg" /> : value}
      </div>
      <div className="mt-[3px] text-[12.5px] text-muted">{label}</div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
  accent = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  accent?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-line bg-white ${accent}`}
    >
      <div className="border-b border-[#edf0f5] px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>
        ) : null}
      </div>
      <div className="space-y-4 px-4 py-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  color = "sky",
}: {
  label: string;
  children: ReactNode;
  color?: "sky" | "orange" | "cyan" | "lime" | "rose";
}) {
  const dot: Record<string, string> = {
    sky: "bg-sky-400",
    orange: "bg-orange-400",
    cyan: "bg-cyan-400",
    lime: "bg-lime-500",
    rose: "bg-rose-400",
  };
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-ink">
        <span className={`size-1.5 rounded-full ${dot[color]}`} />
        {label}
      </span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  color = "emerald",
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  color?: "emerald" | "sky";
}) {
  const ring =
    color === "emerald" ? "accent-emerald-600" : "accent-sky-600";
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e8edf5] bg-[#fbfcfe] px-3 py-3">
      <input
        type="checkbox"
        className={`mt-1 size-4 ${ring}`}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-ink">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[12px] text-muted">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
