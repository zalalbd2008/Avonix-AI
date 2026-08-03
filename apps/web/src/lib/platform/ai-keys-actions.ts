"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformOwner } from "@/lib/auth/session";
import type { CepAiProvider } from "@/lib/db/schema";
import { savePlatformAiKeys } from "@/lib/platform/ai-keys";
import { recordPlatformEvent } from "@/lib/platform/owner";

export async function actionSavePlatformAiKeys(input: {
  keys: Partial<Record<CepAiProvider, string>>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const owner = await requirePlatformOwner();
  const result = await savePlatformAiKeys(input.keys ?? {});
  if (!result.ok) return result;

  const changed = Object.entries(input.keys ?? {})
    .filter(([, v]) => {
      const t = (v ?? "").trim();
      return t && !t.includes("…") && !t.includes("...");
    })
    .map(([k]) => k);

  const cleared = Object.entries(input.keys ?? {})
    .filter(([, v]) => (v ?? "").trim() === "")
    .map(([k]) => k);

  await recordPlatformEvent({
    userId: owner.userId,
    event: "platform.ai_keys.updated",
    detail: [
      changed.length ? `set:${changed.join(",")}` : "",
      cleared.length ? `cleared:${cleared.join(",")}` : "",
    ]
      .filter(Boolean)
      .join(" · "),
  });

  revalidatePath("/platform/ai");
  revalidatePath("/platform/settings");
  return { ok: true };
}
