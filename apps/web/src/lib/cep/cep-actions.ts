"use server";

import { requireAgency } from "@/lib/auth/session";
import { saveCepWidget } from "@/lib/cep/cep-service";
import type {
  CepWidgetPayload,
  CepWidgetStatus,
  CepWidgetSurface,
} from "@/lib/db/schema";

export async function actionSaveCepWidget(input: {
  id?: string;
  clientId: string;
  websiteId: string;
  name: string;
  status: CepWidgetStatus;
  surface: CepWidgetSurface;
  isEnabled: boolean;
  payload: CepWidgetPayload;
}) {
  const ctx = await requireAgency();
  return saveCepWidget({
    agencyId: ctx.agencyId,
    clientId: input.clientId,
    websiteId: input.websiteId,
    id: input.id,
    name: input.name,
    status: input.status,
    surface: input.surface,
    isEnabled: input.isEnabled,
    payload: input.payload,
  });
}
