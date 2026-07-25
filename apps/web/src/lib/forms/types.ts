import type { FormField, FormSettings } from "@/lib/db/schema";

/**
 * The shape the builder sends and the service accepts.
 *
 * In its own file so the client component can name it without importing
 * service.ts — see the note at the top of fields.ts.
 */
export type CreateFormInput = {
  clientId: string;
  name: string;
  websiteId?: string;
  fields: FormField[];
  settings?: FormSettings;
  submitLabel?: string;
  successMessage?: string;
};

export type UpdateFormInput = CreateFormInput & {
  formId: string;
};

export type FormIdInput = {
  clientId: string;
  websiteId?: string;
  formId: string;
};
