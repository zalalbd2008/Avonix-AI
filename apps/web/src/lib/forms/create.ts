"use server";

import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import { createFormForClient, updateFormForClient, deleteFormForClient, duplicateFormForClient } from "./service";
import type { CreateFormInput, UpdateFormInput, FormIdInput } from "./types";

type ActionResult =
  | { ok: true; formId: string }
  | { ok: false; error: string };

function revalidateFormPaths(input: {
  clientId: string;
  websiteId?: string;
  formId?: string;
}) {
  revalidatePath(`/clients/${input.clientId}/forms`);
  if (input.formId) {
    revalidatePath(`/clients/${input.clientId}/forms/${input.formId}`);
  }
  if (input.websiteId) {
    revalidatePath(`/clients/${input.clientId}/websites/${input.websiteId}/forms`);
    revalidatePath(`/clients/${input.clientId}/websites/${input.websiteId}`);
    if (input.formId) {
      revalidatePath(
        `/clients/${input.clientId}/websites/${input.websiteId}/forms/${input.formId}/edit`,
      );
    }
  }
}

function parseCreateInput(raw: string | CreateFormInput): CreateFormInput {
  if (typeof raw === "string") {
    return JSON.parse(raw) as CreateFormInput;
  }
  return raw;
}

function parseUpdateInput(raw: string | UpdateFormInput): UpdateFormInput {
  if (typeof raw === "string") {
    return JSON.parse(raw) as UpdateFormInput;
  }
  return raw;
}

/**
 * Server action: create a new form.
 * Accepts a JSON string to avoid Next.js server-action serialization hangs
 * on large theme objects.
 */
export async function createForm(
  raw: string | CreateFormInput,
): Promise<ActionResult> {
  let input: CreateFormInput;
  try {
    input = parseCreateInput(raw);
  } catch {
    return { ok: false, error: "Invalid form payload." };
  }

  const ctx = await requireAgency();

  try {
    const result = await createFormForClient(ctx.agencyId, input);
    if (result.ok) {
      revalidateFormPaths({
        clientId: input.clientId,
        websiteId: input.websiteId,
        formId: result.formId,
      });
    }
    return result;
  } catch (e) {
    console.error("createForm failed", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not create the form. Try again.",
    };
  }
}

/**
 * Server action: save changes to an existing form.
 * Accepts a JSON string for the same reason as createForm.
 */
export async function updateForm(
  raw: string | UpdateFormInput,
): Promise<ActionResult> {
  let input: UpdateFormInput;
  try {
    input = parseUpdateInput(raw);
  } catch {
    return { ok: false, error: "Invalid form payload." };
  }

  const ctx = await requireAgency();

  try {
    const result = await updateFormForClient(ctx.agencyId, input, {
      actorEmail: ctx.userEmail,
    });
    if (result.ok) {
      revalidateFormPaths({
        clientId: input.clientId,
        websiteId: input.websiteId,
        formId: input.formId,
      });
    }
    return result;
  } catch (e) {
    console.error("updateForm failed", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not save the form. Try again.",
    };
  }
}

/** Soft-delete a form. */
export async function deleteForm(input: FormIdInput): Promise<ActionResult> {
  const ctx = await requireAgency();
  try {
    const result = await deleteFormForClient(ctx.agencyId, input);
    if (result.ok) {
      revalidateFormPaths({
        clientId: input.clientId,
        websiteId: input.websiteId,
        formId: input.formId,
      });
    }
    return result;
  } catch (e) {
    console.error("deleteForm failed", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not delete the form.",
    };
  }
}

/** Duplicate a form. */
export async function duplicateForm(input: FormIdInput): Promise<ActionResult> {
  const ctx = await requireAgency();
  try {
    const result = await duplicateFormForClient(ctx.agencyId, input);
    if (result.ok) {
      revalidateFormPaths({
        clientId: input.clientId,
        websiteId: input.websiteId,
        formId: result.formId,
      });
    }
    return result;
  } catch (e) {
    console.error("duplicateForm failed", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not duplicate the form.",
    };
  }
}
