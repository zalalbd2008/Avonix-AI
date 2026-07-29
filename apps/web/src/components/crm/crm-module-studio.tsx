"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { PageHeader } from "@/components/shell/page-header";
import {
  actionAdvanceDocument,
  actionCreateAssignRule,
  actionCreateCalendarEvent,
  actionCreateDocument,
  actionCreateFile,
  actionCreateNote,
  actionCreateTask,
  actionCreateTicket,
  actionSetTaskStatus,
  actionSetTicketStatus,
} from "@/lib/crm/ops-actions";
import { crmModules, type CrmModuleId } from "@/lib/crm/modules";

const input =
  "w-full rounded-lg border-2 border-[#dce8f5] bg-white px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

type Bundle = {
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    dueAt: Date | string | null;
    assignee: string;
  }>;
  notes: Array<{ id: string; body: string; pinned: boolean; createdAt: Date | string }>;
  files: Array<{ id: string; name: string; kind: string; url: string }>;
  rules: Array<{
    id: string;
    name: string;
    matchField: string;
    matchValue: string;
    assignee: string;
    enabled: boolean;
  }>;
  tickets: Array<{ id: string; subject: string; status: string; assignee: string }>;
  events: Array<{
    id: string;
    title: string;
    kind: string;
    startsAt: Date | string;
  }>;
  docs: Array<{
    id: string;
    docType: string;
    title: string;
    status: string;
    amountCents: number;
  }>;
  contacts: Array<{
    id: string;
    name: string | null;
    email: string | null;
    fields: Record<string, unknown>;
  }>;
};

const emptyBundle: Bundle = {
  tasks: [],
  notes: [],
  files: [],
  rules: [],
  tickets: [],
  events: [],
  docs: [],
  contacts: [],
};

export function CrmModuleStudio({
  clientId,
  websiteId,
  moduleId,
  websiteName,
  initial,
}: {
  clientId: string;
  websiteId: string;
  moduleId: CrmModuleId;
  websiteName: string;
  initial: Partial<Bundle>;
}) {
  const router = useRouter();
  const meta = crmModules(clientId, websiteId).find((m) => m.id === moduleId);
  const [bundle, setBundle] = useState<Bundle>({ ...emptyBundle, ...initial });
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    setBundle({ ...emptyBundle, ...initial });
  }, [initial]);

  const title = meta?.label ?? moduleId;
  const subtitle = meta?.hint ?? websiteName;
  const hub = `/clients/${clientId}/websites/${websiteId}/crm`;
  const scope = { clientId, websiteId };

  function flash() {
    setOk(true);
    setTimeout(() => setOk(false), 1400);
  }

  function refresh() {
    start(() => {
      router.refresh();
    });
  }

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {ok ? <span className="text-[12px] font-semibold text-ok">Saved</span> : null}
            {error ? (
              <span className="max-w-[220px] text-[12px] text-bad">{error}</span>
            ) : null}
            <Link
              href={hub as never}
              prefetch
              className="rounded-lg border border-line bg-white px-3 py-2 text-[13px] font-semibold text-ink hover:bg-[#f8fafc]"
            >
              All CRM
            </Link>
          </div>
        }
      />

      <div className="mb-5 rounded-2xl border border-line bg-white px-5 py-4">
        <p className="text-[12px] font-bold tracking-wide text-faint uppercase">
          Step {meta?.step ?? "—"} · {websiteName}
        </p>
        <p className="mt-1 max-w-2xl text-[14px] text-muted">
          One screen, one job. Data stays on this website&apos;s CRM.
        </p>
      </div>

      {moduleId === "tasks" && (
        <TasksPanel
          {...scope}
          items={bundle.tasks}
          pending={pending}
          onError={setError}
          onOk={() => {
            flash();
            refresh();
          }}
        />
      )}
      {moduleId === "notes" && (
        <NotesPanel
          {...scope}
          items={bundle.notes}
          pending={pending}
          onError={setError}
          onOk={() => {
            flash();
            refresh();
          }}
        />
      )}
      {moduleId === "assign" && (
        <AssignPanel
          {...scope}
          items={bundle.rules}
          pending={pending}
          onError={setError}
          onOk={() => {
            flash();
            refresh();
          }}
        />
      )}
      {moduleId === "files" && (
        <FilesPanel
          {...scope}
          items={bundle.files}
          pending={pending}
          onError={setError}
          onOk={() => {
            flash();
            refresh();
          }}
        />
      )}
      {moduleId === "tickets" && (
        <TicketsPanel
          {...scope}
          items={bundle.tickets}
          pending={pending}
          onError={setError}
          onOk={() => {
            flash();
            refresh();
          }}
        />
      )}
      {moduleId === "calendar" && (
        <CalendarPanel
          {...scope}
          items={bundle.events}
          pending={pending}
          onError={setError}
          onOk={() => {
            flash();
            refresh();
          }}
        />
      )}
      {(moduleId === "proposals" ||
        moduleId === "quotes" ||
        moduleId === "invoices" ||
        moduleId === "esign") && (
        <DocsPanel
          {...scope}
          moduleId={moduleId}
          items={bundle.docs}
          pending={pending}
          onError={setError}
          onOk={() => {
            flash();
            refresh();
          }}
        />
      )}
      {moduleId === "score" && <ScorePanel contacts={bundle.contacts} />}
      {moduleId === "journey" && (
        <JourneyPanel clientId={clientId} websiteId={websiteId} contacts={bundle.contacts} />
      )}
      {moduleId === "predict" && <PredictPanel contacts={bundle.contacts} />}
      {moduleId === "forecast" && <ForecastPanel docs={bundle.docs} />}
      {moduleId === "health" && <HealthPanel contacts={bundle.contacts} />}
      {moduleId === "booking" && (
        <SimpleSteps
          title="Booking flow"
          steps={[
            "Customer picks a date",
            "Chooses a time slot",
            "Selects staff",
            "Gets confirmation",
          ]}
          tip="Create calendar events for confirmed bookings in Calendar."
        />
      )}
      {moduleId === "knowledge" && (
        <SimpleSteps
          title="Knowledge for AI"
          steps={[
            "Add FAQs & policies as files",
            "Tag them Knowledge in Files",
            "Website AI Chat uses site knowledge; attach SOP here for the team",
          ]}
        />
      )}
      {moduleId === "portal" && (
        <SimpleSteps
          title="Customer portal"
          steps={[
            "Form submissions can mint portal links",
            "Show invoices, files, appointments here next",
            "Customers never see internal Notes",
          ]}
        />
      )}
      {moduleId === "templates" && (
        <TemplatesPanel
          {...scope}
          onInstall={() => {
            setError(null);
            flash();
            refresh();
          }}
        />
      )}
      {moduleId === "copilot" && (
        <CopilotPanel
          {...scope}
          onError={setError}
          onOk={() => {
            flash();
            refresh();
          }}
        />
      )}
      {moduleId === "inbox" && (
        <div className="rounded-2xl border border-line bg-white p-6">
          <p className="text-[14px] text-muted">
            Unified inbox is ready — email, live chat, and handoff threads.
          </p>
          <Link
            href={`/clients/${clientId}/websites/${websiteId}/conversations` as never}
            prefetch
            className="mt-4 inline-flex rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white"
          >
            Open Messages
          </Link>
        </div>
      )}
    </div>
  );
}

function Card({
  title,
  children,
  accent = "border-l-sky-400",
}: {
  title: string;
  children: ReactNode;
  accent?: string;
}) {
  return (
    <section
      className={`mb-4 overflow-hidden rounded-2xl border border-line bg-white border-l-4 ${accent}`}
    >
      <h2 className="border-b border-[#edf0f5] px-5 py-3.5 text-sm font-semibold">
        {title}
      </h2>
      <div className="space-y-3 px-5 py-4">{children}</div>
    </section>
  );
}

function TasksPanel({
  clientId,
  websiteId,
  items,
  pending,
  onError,
  onOk,
}: {
  clientId: string;
  websiteId: string;
  items: Bundle["tasks"];
  pending: boolean;
  onError: (e: string | null) => void;
  onOk: () => void;
}) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [assignee, setAssignee] = useState("");

  return (
    <>
      <Card title="New task" accent="border-l-sky-400">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className={input}
            placeholder="Call John"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className={input}
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
          <input
            className={input}
            placeholder="Assignee"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          />
        </div>
        <button
          type="button"
          disabled={pending}
          className="rounded-lg bg-sky-600 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
          onClick={async () => {
            onError(null);
            const res = await actionCreateTask({
              clientId,
              websiteId,
              title,
              dueAt: due || null,
              assignee,
            });
            if (!res.ok) onError(res.error);
            else {
              setTitle("");
              onOk();
            }
          }}
        >
          + Add task
        </button>
      </Card>
      <Card title="Open tasks" accent="border-l-sky-300">
        {items.length === 0 ? (
          <Empty>No tasks yet — add “Call John” for tomorrow.</Empty>
        ) : (
          items.map((t) => (
            <Row
              key={t.id}
              title={t.title}
              meta={`${t.status}${t.dueAt ? ` · due ${fmtDate(t.dueAt)}` : ""}${t.assignee ? ` · ${t.assignee}` : ""}`}
              action={
                t.status === "open" ? (
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-ok"
                    onClick={async () => {
                      await actionSetTaskStatus({
                        clientId,
                        websiteId,
                        taskId: t.id,
                        status: "done",
                      });
                      onOk();
                    }}
                  >
                    Done
                  </button>
                ) : null
              }
            />
          ))
        )}
      </Card>
    </>
  );
}

function NotesPanel(props: {
  clientId: string;
  websiteId: string;
  items: Bundle["notes"];
  pending: boolean;
  onError: (e: string | null) => void;
  onOk: () => void;
}) {
  const [body, setBody] = useState("");
  return (
    <>
      <Card title="Internal note" accent="border-l-amber-400">
        <p className="text-[12px] text-muted">Customers never see these.</p>
        <textarea
          className={`${input} min-h-[88px]`}
          placeholder="Price sensitive · Call after 5 PM"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button
          type="button"
          disabled={props.pending}
          className="rounded-lg bg-amber-600 px-3.5 py-2 text-[13px] font-semibold text-white"
          onClick={async () => {
            props.onError(null);
            const res = await actionCreateNote({
              clientId: props.clientId,
              websiteId: props.websiteId,
              body,
            });
            if (!res.ok) props.onError(res.error);
            else {
              setBody("");
              props.onOk();
            }
          }}
        >
          + Save note
        </button>
      </Card>
      <Card title="Notes" accent="border-l-amber-300">
        {props.items.length === 0 ? (
          <Empty>No internal notes yet.</Empty>
        ) : (
          props.items.map((n) => (
            <Row key={n.id} title={n.body} meta={fmtDate(n.createdAt)} />
          ))
        )}
      </Card>
    </>
  );
}

function AssignPanel(props: {
  clientId: string;
  websiteId: string;
  items: Bundle["rules"];
  pending: boolean;
  onError: (e: string | null) => void;
  onOk: () => void;
}) {
  const [field, setField] = useState("city");
  const [value, setValue] = useState("");
  const [assignee, setAssignee] = useState("");
  return (
    <>
      <Card title="Auto assignment" accent="border-l-violet-400">
        <div className="grid gap-3 sm:grid-cols-3">
          <select
            className={input}
            value={field}
            onChange={(e) => setField(e.target.value)}
          >
            <option value="city">City / Region</option>
            <option value="state">State</option>
            <option value="industry">Industry</option>
            <option value="service">Service</option>
          </select>
          <input
            className={input}
            placeholder="Texas / Healthcare"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <input
            className={input}
            placeholder="David / Sarah / Alex"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          />
        </div>
        <button
          type="button"
          disabled={props.pending}
          className="rounded-lg bg-violet-600 px-3.5 py-2 text-[13px] font-semibold text-white"
          onClick={async () => {
            props.onError(null);
            const res = await actionCreateAssignRule({
              clientId: props.clientId,
              websiteId: props.websiteId,
              name: "",
              matchField: field,
              matchValue: value,
              assignee,
            });
            if (!res.ok) props.onError(res.error);
            else {
              setValue("");
              props.onOk();
            }
          }}
        >
          + Add rule
        </button>
      </Card>
      <Card title="Rules" accent="border-l-violet-300">
        {props.items.length === 0 ? (
          <Empty>Example: Texas Lead → David</Empty>
        ) : (
          props.items.map((r) => (
            <Row
              key={r.id}
              title={`${r.matchValue} → ${r.assignee}`}
              meta={`${r.matchField} · ${r.enabled ? "on" : "off"}`}
            />
          ))
        )}
      </Card>
    </>
  );
}

function FilesPanel(props: {
  clientId: string;
  websiteId: string;
  items: Bundle["files"];
  pending: boolean;
  onError: (e: string | null) => void;
  onOk: () => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("proposal");
  const [url, setUrl] = useState("");
  return (
    <>
      <Card title="Attach file" accent="border-l-cyan-400">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className={input}
            placeholder="Proposal.pdf"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className={input}
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            {[
              "proposal",
              "contract",
              "invoice",
              "image",
              "pdf",
              "voice",
              "other",
            ].map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <input
            className={input}
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <button
          type="button"
          disabled={props.pending}
          className="rounded-lg bg-cyan-600 px-3.5 py-2 text-[13px] font-semibold text-white"
          onClick={async () => {
            props.onError(null);
            const res = await actionCreateFile({
              clientId: props.clientId,
              websiteId: props.websiteId,
              name,
              kind,
              url,
            });
            if (!res.ok) props.onError(res.error);
            else {
              setName("");
              setUrl("");
              props.onOk();
            }
          }}
        >
          + Add file
        </button>
      </Card>
      <Card title="Files" accent="border-l-cyan-300">
        {props.items.length === 0 ? (
          <Empty>Link proposals, contracts, invoices, voice notes.</Empty>
        ) : (
          props.items.map((f) => (
            <Row
              key={f.id}
              title={f.name}
              meta={f.kind}
              action={
                f.url ? (
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12px] font-semibold text-brand"
                  >
                    Open
                  </a>
                ) : null
              }
            />
          ))
        )}
      </Card>
    </>
  );
}

function TicketsPanel(props: {
  clientId: string;
  websiteId: string;
  items: Bundle["tickets"];
  pending: boolean;
  onError: (e: string | null) => void;
  onOk: () => void;
}) {
  const [subject, setSubject] = useState("");
  return (
    <>
      <Card title="New ticket" accent="border-l-red-400">
        <input
          className={input}
          placeholder="Support subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <button
          type="button"
          disabled={props.pending}
          className="rounded-lg bg-red-600 px-3.5 py-2 text-[13px] font-semibold text-white"
          onClick={async () => {
            props.onError(null);
            const res = await actionCreateTicket({
              clientId: props.clientId,
              websiteId: props.websiteId,
              subject,
            });
            if (!res.ok) props.onError(res.error);
            else {
              setSubject("");
              props.onOk();
            }
          }}
        >
          + Open ticket
        </button>
      </Card>
      <Card title="Tickets" accent="border-l-red-300">
        {props.items.length === 0 ? (
          <Empty>Open → Pending → Waiting → Resolved → Closed</Empty>
        ) : (
          props.items.map((t) => (
            <Row
              key={t.id}
              title={t.subject}
              meta={t.status}
              action={
                <select
                  className="rounded border border-line px-2 py-1 text-[12px]"
                  value={t.status}
                  onChange={async (e) => {
                    await actionSetTicketStatus({
                      clientId: props.clientId,
              websiteId: props.websiteId,
                      ticketId: t.id,
                      status: e.target.value as never,
                    });
                    props.onOk();
                  }}
                >
                  {["open", "pending", "waiting", "resolved", "closed"].map(
                    (s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ),
                  )}
                </select>
              }
            />
          ))
        )}
      </Card>
    </>
  );
}

function CalendarPanel(props: {
  clientId: string;
  websiteId: string;
  items: Bundle["events"];
  pending: boolean;
  onError: (e: string | null) => void;
  onOk: () => void;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("meeting");
  const [startsAt, setStartsAt] = useState("");
  return (
    <>
      <Card title="Add to calendar" accent="border-l-sky-500">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className={input}
            placeholder="Sales visit"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <select
            className={input}
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            {["meeting", "appointment", "reminder", "holiday", "visit"].map(
              (k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ),
            )}
          </select>
          <input
            className={input}
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>
        <button
          type="button"
          disabled={props.pending}
          className="rounded-lg bg-sky-700 px-3.5 py-2 text-[13px] font-semibold text-white"
          onClick={async () => {
            props.onError(null);
            const res = await actionCreateCalendarEvent({
              clientId: props.clientId,
              websiteId: props.websiteId,
              title,
              kind,
              startsAt,
            });
            if (!res.ok) props.onError(res.error);
            else {
              setTitle("");
              props.onOk();
            }
          }}
        >
          + Add event
        </button>
      </Card>
      <Card title="Upcoming" accent="border-l-sky-300">
        {props.items.length === 0 ? (
          <Empty>Meetings, reminders, holidays, sales visits.</Empty>
        ) : (
          props.items.map((e) => (
            <Row
              key={e.id}
              title={e.title}
              meta={`${e.kind} · ${fmtDate(e.startsAt)}`}
            />
          ))
        )}
      </Card>
    </>
  );
}

function DocsPanel(props: {
  clientId: string;
  websiteId: string;
  moduleId: CrmModuleId;
  items: Bundle["docs"];
  pending: boolean;
  onError: (e: string | null) => void;
  onOk: () => void;
}) {
  const docType =
    props.moduleId === "proposals"
      ? "proposal"
      : props.moduleId === "quotes"
        ? "quote"
        : props.moduleId === "esign"
          ? "contract"
          : "invoice";
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const filtered = props.items.filter((d) =>
    props.moduleId === "esign"
      ? d.docType === "contract" || d.docType === "proposal"
      : d.docType === docType,
  );
  const nextStatus: Record<string, string> = {
    draft: "sent",
    sent: "viewed",
    viewed: "approved",
    approved: props.moduleId === "esign" ? "signed" : "paid",
    signed: "paid",
  };

  return (
    <>
      <Card title={`New ${docType}`} accent="border-l-indigo-400">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className={input}
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className={input}
            placeholder="Amount (USD)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <button
          type="button"
          disabled={props.pending}
          className="rounded-lg bg-indigo-600 px-3.5 py-2 text-[13px] font-semibold text-white"
          onClick={async () => {
            props.onError(null);
            const cents = Math.round(Number(amount || 0) * 100);
            const res = await actionCreateDocument({
              clientId: props.clientId,
              websiteId: props.websiteId,
              docType: docType as never,
              title,
              amountCents: Number.isFinite(cents) ? cents : 0,
            });
            if (!res.ok) props.onError(res.error);
            else {
              setTitle("");
              setAmount("");
              props.onOk();
            }
          }}
        >
          + Create
        </button>
      </Card>
      <Card title="Pipeline" accent="border-l-indigo-300">
        {filtered.length === 0 ? (
          <Empty>Draft → Send → Approve → Sign / Pay</Empty>
        ) : (
          filtered.map((d) => (
            <Row
              key={d.id}
              title={d.title}
              meta={`${d.status} · $${(d.amountCents / 100).toFixed(2)}`}
              action={
                nextStatus[d.status] ? (
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-brand"
                    onClick={async () => {
                      await actionAdvanceDocument({
                        clientId: props.clientId,
              websiteId: props.websiteId,
                        documentId: d.id,
                        status: nextStatus[d.status] as never,
                      });
                      props.onOk();
                    }}
                  >
                    → {nextStatus[d.status]}
                  </button>
                ) : null
              }
            />
          ))
        )}
      </Card>
    </>
  );
}

function ScorePanel({ contacts }: { contacts: Bundle["contacts"] }) {
  const rows = useMemo(
    () =>
      contacts.slice(0, 20).map((c) => {
        const fields = c.fields ?? {};
        const base = typeof fields.aiScore === "number" ? fields.aiScore : 40;
        const visits = Number(fields.visits ?? 0);
        const opens = Number(fields.emailOpens ?? 0);
        const score = Math.min(
          100,
          base + Math.min(20, visits * 2) + Math.min(15, opens * 5),
        );
        return { ...c, score };
      }),
    [contacts],
  );
  return (
    <Card title="Smart lead score" accent="border-l-lime-400">
      <p className="text-[12px] text-muted mb-2">
        Visits + email opens + AI score → 0–100.
      </p>
      {rows.length === 0 ? (
        <Empty>Contacts will show scores here.</Empty>
      ) : (
        rows.map((c) => (
          <Row
            key={c.id}
            title={c.name || c.email || "Contact"}
            meta={`${c.score} / 100`}
          />
        ))
      )}
    </Card>
  );
}

function JourneyPanel({
  clientId,
  contacts,
}: {
  clientId: string;
  websiteId: string;
  contacts: Bundle["contacts"];
}) {
  const first = contacts[0];
  return (
    <Card title="Customer journey map" accent="border-l-rose-400">
      <ol className="space-y-3">
        {[
          "Visited website",
          "Downloaded PDF",
          "Contact form",
          "Email",
          "Appointment",
          "Invoice",
          "Payment",
          "Review",
        ].map((step, i) => (
          <li key={step} className="flex items-center gap-3">
            <span className="grid size-7 place-items-center rounded-full bg-rose-100 text-[11px] font-bold text-rose-800">
              {i + 1}
            </span>
            <span className="text-[13px] font-semibold text-ink">{step}</span>
          </li>
        ))}
      </ol>
      {first ? (
        <Link
          href={`/clients/${clientId}/contacts/${first.id}` as never} /* website-scoped contact */
          className="mt-2 inline-block text-[13px] font-semibold text-brand"
        >
          Open live timeline →
        </Link>
      ) : null}
    </Card>
  );
}

function PredictPanel({ contacts }: { contacts: Bundle["contacts"] }) {
  const rows = contacts.slice(0, 12).map((c) => {
    const score =
      typeof c.fields?.aiScore === "number" ? c.fields.aiScore : 45;
    const chance = Math.min(95, Math.max(8, Math.round(score * 0.9 + 5)));
    return { ...c, chance };
  });
  return (
    <Card title="AI predictive engine" accent="border-l-violet-500">
      {rows.length === 0 ? (
        <Empty>Purchase probability appears when contacts exist.</Empty>
      ) : (
        rows.map((c) => (
          <Row
            key={c.id}
            title={c.name || c.email || "Contact"}
            meta={`${c.chance}% chance to purchase within 7 days`}
          />
        ))
      )}
    </Card>
  );
}

function ForecastPanel({ docs }: { docs: Bundle["docs"] }) {
  const open = docs.filter((d) =>
    ["sent", "viewed", "approved", "draft"].includes(d.status),
  );
  const total = open.reduce((s, d) => s + d.amountCents, 0);
  return (
    <Card title="Revenue forecast" accent="border-l-emerald-500">
      <p className="text-3xl font-bold tracking-[-0.03em] text-ink">
        ${(total / 100).toLocaleString()}
      </p>
      <p className="mt-1 text-[13px] text-muted">
        Expected from open proposals / quotes / invoices this pipeline.
      </p>
    </Card>
  );
}

function HealthPanel({ contacts }: { contacts: Bundle["contacts"] }) {
  const rows = contacts.slice(0, 15).map((c) => {
    const score =
      typeof c.fields?.aiScore === "number" ? c.fields.aiScore : 50;
    const health =
      score >= 70 ? "Healthy" : score >= 45 ? "Active" : score >= 25 ? "At Risk" : "Churn Risk";
    return { ...c, health };
  });
  return (
    <Card title="Customer health" accent="border-l-pink-400">
      {rows.length === 0 ? (
        <Empty>Health scores need contacts.</Empty>
      ) : (
        rows.map((c) => (
          <Row
            key={c.id}
            title={c.name || c.email || "Contact"}
            meta={c.health}
          />
        ))
      )}
    </Card>
  );
}

function TemplatesPanel({
  clientId,
  websiteId,
  onInstall,
}: {
  clientId: string;
  websiteId: string;
  onInstall: () => void;
}) {
  const packs = [
    { name: "Real Estate", match: "city", value: "Houston", assignee: "Alex" },
    { name: "Healthcare", match: "industry", value: "Healthcare", assignee: "Alex" },
    { name: "Roofing", match: "service", value: "Roof Repair", assignee: "David" },
    { name: "Law Firm", match: "industry", value: "Legal", assignee: "Sarah" },
  ];
  return (
    <Card title="Workflow marketplace" accent="border-l-amber-500">
      <div className="grid gap-3 sm:grid-cols-2">
        {packs.map((p) => (
          <button
            key={p.name}
            type="button"
            className="rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-left hover:bg-amber-100"
            onClick={async () => {
              await actionCreateAssignRule({
                clientId,
                websiteId,
                name: `${p.name} pack`,
                matchField: p.match,
                matchValue: p.value,
                assignee: p.assignee,
              });
              await actionCreateTask({
                clientId,
                websiteId,
                title: `${p.name}: follow new leads`,
                dueAt: null,
              });
              onInstall();
            }}
          >
            <span className="block text-[14px] font-bold text-ink">{p.name}</span>
            <span className="mt-1 block text-[12px] text-muted">
              Install → ready
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function CopilotPanel({
  clientId,
  websiteId,
  onError,
  onOk,
}: {
  clientId: string;
  websiteId: string;
  onError: (e: string | null) => void;
  onOk: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [log, setLog] = useState<string[]>([]);

  async function run() {
    onError(null);
    const text = prompt.trim();
    if (!text) return;
    const lower = text.toLowerCase();
    const actions: string[] = [];

    const assignMatch = lower.match(
      /(?:assign|পাঠাও|দিক).*?(?:to|কাছে)\s+([a-zA-Z]+)/i,
    ) || lower.match(/([a-zA-Z]+)(?:'s| এর)?\s*(?:কাছে|to)\s*assign/i);
    const place =
      lower.match(/\b(houston|texas|florida|dallas)\b/i)?.[1] ||
      lower.match(/\b(roofing|healthcare|dental)\b/i)?.[1];

    if (place && (assignMatch || /assign|অ্যাসাইন|কাছে/.test(lower))) {
      const who = assignMatch?.[1] || "Alex";
      await actionCreateAssignRule({
        clientId,
        websiteId,
        name: `Copilot: ${place} → ${who}`,
        matchField: /roofing|healthcare|dental/i.test(place)
          ? "service"
          : "city",
        matchValue: place,
        assignee: who[0]!.toUpperCase() + who.slice(1),
      });
      actions.push(`Assign rule: ${place} → ${who}`);
    }

    if (/follow|reminder|quote|offer|ইমেইল|পাঠাও|follow-up/i.test(lower)) {
      await actionCreateTask({
        clientId,
        websiteId,
        title: text.slice(0, 120),
        dueAt: new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10),
      });
      actions.push("Created follow-up task (due in 5 days)");
    }

    if (!actions.length) {
      await actionCreateTask({
        clientId,
        websiteId,
        title: `Copilot: ${text.slice(0, 100)}`,
        dueAt: null,
      });
      actions.push("Saved as a task for your team");
    }

    setLog((l) => [`“${text}” → ${actions.join(" · ")}`, ...l].slice(0, 8));
    setPrompt("");
    onOk();
  }

  return (
    <Card title="AI Copilot" accent="border-l-[#ff6600]">
      <p className="text-[13px] text-muted">
        Write in plain language. Copilot creates assign rules and tasks.
      </p>
      <textarea
        className={`${input} min-h-[100px]`}
        placeholder='e.g. Houston roofing leads assign to Alex. Or: send follow-up to quotes with no reply in 5 days.'
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button
        type="button"
        className="rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white"
        onClick={() => void run()}
      >
        Run with Copilot
      </button>
      {log.length ? (
        <ul className="space-y-2 pt-2">
          {log.map((l) => (
            <li
              key={l}
              className="rounded-lg border border-[#ffe4cc] bg-[#fff7f0] px-3 py-2 text-[12.5px] text-ink"
            >
              {l}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function SimpleSteps({
  title,
  steps,
  tip,
}: {
  title: string;
  steps: string[];
  tip?: string;
}) {
  return (
    <Card title={title} accent="border-l-slate-400">
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={s} className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#eef2f7] text-[11px] font-bold">
              {i + 1}
            </span>
            <span className="text-[13px] font-medium text-ink">{s}</span>
          </li>
        ))}
      </ol>
      {tip ? <p className="text-[12px] text-muted">{tip}</p> : null}
    </Card>
  );
}

function Row({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-[#f1f4f8] py-2.5 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-ink">{title}</p>
        {meta ? <p className="text-[12px] text-muted">{meta}</p> : null}
      </div>
      {action}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-[13px] text-muted">{children}</p>;
}

function fmtDate(v: Date | string) {
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}
