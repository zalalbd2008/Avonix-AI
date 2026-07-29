import type { WebsiteSettings } from "@/lib/db/schema";
import {
  countByKind,
  mergeErrorLogSettings,
  type ErrorLogSnapshot,
} from "./types";

export function loadErrorLogSnapshot(input: {
  website: {
    id: string;
    name: string;
    url: string;
    status: string;
    connectorVersion: string | null;
  };
  settings?: WebsiteSettings | null;
}): ErrorLogSnapshot {
  const errorLog = mergeErrorLogSettings(input.settings?.errorLog);
  const entries = [...errorLog.entries].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const connected = input.website.status === "connected";
  const collectorReady =
    connected &&
    errorLog.enabled &&
    (errorLog.collectPhp ||
      errorLog.collectJs ||
      errorLog.collectDb ||
      errorLog.collectApi ||
      errorLog.collectSmtp);

  return {
    website: input.website,
    stats: {
      fatal: countByKind(entries, "fatal"),
      warning: countByKind(entries, "warning"),
      notice: countByKind(entries, "notice"),
      db: countByKind(entries, "db"),
      api: countByKind(entries, "api"),
      smtp: countByKind(entries, "smtp"),
      js: countByKind(entries, "js"),
      total: entries.length,
    },
    entries,
    collectorReady,
  };
}
