"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import {
  contacts,
  crmAssignmentRules,
  crmCalendarEvents,
  crmDocuments,
  crmFiles,
  crmNotes,
  crmTasks,
  crmTickets,
} from "@/lib/db/schema";
import type { CrmModuleId } from "./modules";
import { crmBase } from "./modules";

function canEdit(permissions: string[] | "*") {
  if (permissions === "*") return true;
  return (
    permissions.includes("websites.edit") ||
    permissions.includes("clients.edit") ||
    permissions.includes("contacts.edit")
  );
}

function revalidateCrm(clientId: string, websiteId: string) {
  const base = crmBase(clientId, websiteId);
  revalidatePath(base);
  revalidatePath(`${base}/[module]`, "page");
}

type Scope = { clientId: string; websiteId: string };

export async function actionCreateTask(input: Scope & {
  title: string;
  dueAt?: string | null;
  assignee?: string;
}) {
  const ctx = await requireAgency();
  if (!canEdit(ctx.permissions)) return { ok: false as const, error: "No permission." };
  const title = input.title.trim();
  if (!title) return { ok: false as const, error: "Task title required." };

  await withAgency(ctx.agencyId, (tx) =>
    tx.insert(crmTasks).values({
      agencyId: ctx.agencyId,
      clientId: input.clientId,
      websiteId: input.websiteId,
      title,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      assignee: (input.assignee ?? "").trim(),
    }),
  );
  revalidateCrm(input.clientId, input.websiteId);
  return { ok: true as const };
}

export async function actionSetTaskStatus(input: Scope & {
  taskId: string;
  status: "open" | "done" | "cancelled";
}) {
  const ctx = await requireAgency();
  if (!canEdit(ctx.permissions)) return { ok: false as const, error: "No permission." };
  await withAgency(ctx.agencyId, (tx) =>
    tx
      .update(crmTasks)
      .set({ status: input.status, updatedAt: new Date() })
      .where(
        and(
          eq(crmTasks.id, input.taskId),
          eq(crmTasks.websiteId, input.websiteId),
        ),
      ),
  );
  revalidateCrm(input.clientId, input.websiteId);
  return { ok: true as const };
}

export async function actionCreateNote(input: Scope & { body: string }) {
  const ctx = await requireAgency();
  if (!canEdit(ctx.permissions)) return { ok: false as const, error: "No permission." };
  const body = input.body.trim();
  if (!body) return { ok: false as const, error: "Note required." };
  await withAgency(ctx.agencyId, (tx) =>
    tx.insert(crmNotes).values({
      agencyId: ctx.agencyId,
      clientId: input.clientId,
      websiteId: input.websiteId,
      body,
    }),
  );
  revalidateCrm(input.clientId, input.websiteId);
  return { ok: true as const };
}

export async function actionCreateFile(input: Scope & {
  name: string;
  kind: string;
  url: string;
}) {
  const ctx = await requireAgency();
  if (!canEdit(ctx.permissions)) return { ok: false as const, error: "No permission." };
  const name = input.name.trim();
  if (!name) return { ok: false as const, error: "File name required." };
  await withAgency(ctx.agencyId, (tx) =>
    tx.insert(crmFiles).values({
      agencyId: ctx.agencyId,
      clientId: input.clientId,
      websiteId: input.websiteId,
      name,
      kind: input.kind.trim() || "other",
      url: input.url.trim(),
    }),
  );
  revalidateCrm(input.clientId, input.websiteId);
  return { ok: true as const };
}

export async function actionCreateAssignRule(input: Scope & {
  name: string;
  matchField: string;
  matchValue: string;
  assignee: string;
}) {
  const ctx = await requireAgency();
  if (!canEdit(ctx.permissions)) return { ok: false as const, error: "No permission." };
  if (!input.matchValue.trim() || !input.assignee.trim()) {
    return { ok: false as const, error: "Match value and assignee required." };
  }
  await withAgency(ctx.agencyId, (tx) =>
    tx.insert(crmAssignmentRules).values({
      agencyId: ctx.agencyId,
      clientId: input.clientId,
      websiteId: input.websiteId,
      name: input.name.trim() || `${input.matchValue} → ${input.assignee}`,
      matchField: input.matchField.trim() || "city",
      matchValue: input.matchValue.trim(),
      assignee: input.assignee.trim(),
      enabled: true,
    }),
  );
  revalidateCrm(input.clientId, input.websiteId);
  return { ok: true as const };
}

export async function actionCreateTicket(input: Scope & {
  subject: string;
  assignee?: string;
}) {
  const ctx = await requireAgency();
  if (!canEdit(ctx.permissions)) return { ok: false as const, error: "No permission." };
  const subject = input.subject.trim();
  if (!subject) return { ok: false as const, error: "Subject required." };
  await withAgency(ctx.agencyId, (tx) =>
    tx.insert(crmTickets).values({
      agencyId: ctx.agencyId,
      clientId: input.clientId,
      websiteId: input.websiteId,
      subject,
      assignee: (input.assignee ?? "").trim(),
    }),
  );
  revalidateCrm(input.clientId, input.websiteId);
  return { ok: true as const };
}

export async function actionSetTicketStatus(input: Scope & {
  ticketId: string;
  status: "open" | "pending" | "waiting" | "resolved" | "closed";
}) {
  const ctx = await requireAgency();
  if (!canEdit(ctx.permissions)) return { ok: false as const, error: "No permission." };
  await withAgency(ctx.agencyId, (tx) =>
    tx
      .update(crmTickets)
      .set({ status: input.status, updatedAt: new Date() })
      .where(
        and(
          eq(crmTickets.id, input.ticketId),
          eq(crmTickets.websiteId, input.websiteId),
        ),
      ),
  );
  revalidateCrm(input.clientId, input.websiteId);
  return { ok: true as const };
}

export async function actionCreateCalendarEvent(input: Scope & {
  title: string;
  kind: string;
  startsAt: string;
}) {
  const ctx = await requireAgency();
  if (!canEdit(ctx.permissions)) return { ok: false as const, error: "No permission." };
  const title = input.title.trim();
  if (!title || !input.startsAt) {
    return { ok: false as const, error: "Title and start time required." };
  }
  await withAgency(ctx.agencyId, (tx) =>
    tx.insert(crmCalendarEvents).values({
      agencyId: ctx.agencyId,
      clientId: input.clientId,
      websiteId: input.websiteId,
      title,
      kind: input.kind.trim() || "meeting",
      startsAt: new Date(input.startsAt),
    }),
  );
  revalidateCrm(input.clientId, input.websiteId);
  return { ok: true as const };
}

export async function actionCreateDocument(input: Scope & {
  docType: "proposal" | "quote" | "invoice" | "contract";
  title: string;
  amountCents?: number;
  body?: string;
}) {
  const ctx = await requireAgency();
  if (!canEdit(ctx.permissions)) return { ok: false as const, error: "No permission." };
  const title = input.title.trim();
  if (!title) return { ok: false as const, error: "Title required." };
  await withAgency(ctx.agencyId, (tx) =>
    tx.insert(crmDocuments).values({
      agencyId: ctx.agencyId,
      clientId: input.clientId,
      websiteId: input.websiteId,
      docType: input.docType,
      title,
      amountCents: Math.max(0, Math.round(input.amountCents ?? 0)),
      body: (input.body ?? "").trim(),
    }),
  );
  revalidateCrm(input.clientId, input.websiteId);
  return { ok: true as const };
}

export async function actionAdvanceDocument(input: Scope & {
  documentId: string;
  status: "draft" | "sent" | "viewed" | "approved" | "signed" | "paid" | "void";
}) {
  const ctx = await requireAgency();
  if (!canEdit(ctx.permissions)) return { ok: false as const, error: "No permission." };
  await withAgency(ctx.agencyId, (tx) =>
    tx
      .update(crmDocuments)
      .set({ status: input.status, updatedAt: new Date() })
      .where(
        and(
          eq(crmDocuments.id, input.documentId),
          eq(crmDocuments.websiteId, input.websiteId),
        ),
      ),
  );
  revalidateCrm(input.clientId, input.websiteId);
  return { ok: true as const };
}

/** Lean fetch — only the tables this module needs. */
export async function loadCrmModuleData(
  clientId: string,
  websiteId: string,
  moduleId: CrmModuleId,
) {
  const ctx = await requireAgency();
  return withAgency(ctx.agencyId, async (tx) => {
    const siteContacts = () =>
      tx
        .select({
          id: contacts.id,
          name: contacts.name,
          email: contacts.email,
          fields: contacts.fields,
        })
        .from(contacts)
        .where(
          and(
            eq(contacts.clientId, clientId),
            eq(contacts.sourceWebsiteId, websiteId),
          ),
        )
        .orderBy(desc(contacts.updatedAt))
        .limit(24);

    switch (moduleId) {
      case "tasks":
        return {
          tasks: await tx
            .select()
            .from(crmTasks)
            .where(eq(crmTasks.websiteId, websiteId))
            .orderBy(desc(crmTasks.createdAt))
            .limit(40),
        };
      case "notes":
        return {
          notes: await tx
            .select()
            .from(crmNotes)
            .where(eq(crmNotes.websiteId, websiteId))
            .orderBy(desc(crmNotes.createdAt))
            .limit(40),
        };
      case "files":
        return {
          files: await tx
            .select()
            .from(crmFiles)
            .where(eq(crmFiles.websiteId, websiteId))
            .orderBy(desc(crmFiles.createdAt))
            .limit(40),
        };
      case "assign":
      case "templates":
      case "copilot":
        return {
          rules: await tx
            .select()
            .from(crmAssignmentRules)
            .where(eq(crmAssignmentRules.websiteId, websiteId))
            .orderBy(desc(crmAssignmentRules.createdAt))
            .limit(40),
          tasks:
            moduleId === "copilot" || moduleId === "templates"
              ? await tx
                  .select()
                  .from(crmTasks)
                  .where(eq(crmTasks.websiteId, websiteId))
                  .orderBy(desc(crmTasks.createdAt))
                  .limit(20)
              : [],
        };
      case "tickets":
        return {
          tickets: await tx
            .select()
            .from(crmTickets)
            .where(eq(crmTickets.websiteId, websiteId))
            .orderBy(desc(crmTickets.createdAt))
            .limit(40),
        };
      case "calendar":
      case "booking":
        return {
          events: await tx
            .select()
            .from(crmCalendarEvents)
            .where(eq(crmCalendarEvents.websiteId, websiteId))
            .orderBy(desc(crmCalendarEvents.startsAt))
            .limit(40),
        };
      case "proposals":
      case "quotes":
      case "invoices":
      case "esign":
      case "forecast":
        return {
          docs: await tx
            .select()
            .from(crmDocuments)
            .where(eq(crmDocuments.websiteId, websiteId))
            .orderBy(desc(crmDocuments.createdAt))
            .limit(40),
        };
      case "score":
      case "journey":
      case "predict":
      case "health":
        return { contacts: await siteContacts() };
      default:
        return {};
    }
  });
}
