"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Route } from "next";
import { ConnectorKeyPanel } from "@/components/connector-key";
import { Field, FormError, SubmitButton } from "@/components/ui/field";
import { createClient } from "@/lib/clients/create";
import { checkWebsiteConnection } from "@/lib/launchpad/actions";
import { WIZARD_STEPS } from "@/lib/launchpad/steps";
import { createWebsite } from "@/lib/websites/actions";
import { isValidWebsiteUrl, WEBSITE_URL_ERROR } from "@/lib/websites/url";

export type LaunchpadWizardProps = {
  /** 0-based starting step. */
  initialStep?: number;
  initialClientId?: string | null;
  initialClientName?: string | null;
  initialWebsiteId?: string | null;
  initialWebsiteName?: string | null;
  initialKey?: string | null;
};

/**
 * Full setup wizard — client → website → plugin → connect → verify → done.
 * Lives at `/launchpad/setup`; Launchpad home links here.
 */
export function LaunchpadWizard({
  initialStep = 0,
  initialClientId = null,
  initialClientName = null,
  initialWebsiteId = null,
  initialWebsiteName = null,
  initialKey = null,
}: LaunchpadWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(
    Math.min(Math.max(initialStep, 0), WIZARD_STEPS.length - 1),
  );
  const [clientId, setClientId] = useState(initialClientId);
  const [clientName, setClientName] = useState(initialClientName ?? "");
  const [websiteId, setWebsiteId] = useState(initialWebsiteId);
  const [websiteName, setWebsiteName] = useState(initialWebsiteName ?? "");
  const [connectorKey, setConnectorKey] = useState(initialKey);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<
    "pending" | "connected" | "disconnected" | null
  >(null);

  const progressPercent = useMemo(
    () => Math.round((step / (WIZARD_STEPS.length - 1)) * 100),
    [step],
  );

  function go(next: number) {
    setError(null);
    setStep(Math.min(Math.max(next, 0), WIZARD_STEPS.length - 1));
  }

  async function onCreateClient(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const fd = new FormData(e.currentTarget);
      const name = String(fd.get("name") ?? "");
      const result = await createClient(fd);
      if (!result.ok) {
        setError(result.error);
        setPending(false);
        return;
      }
      setClientId(result.clientId);
      setClientName(name);
      setPending(false);
      go(1);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  async function onCreateWebsite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || !clientId) return;
    const fd = new FormData(e.currentTarget);
    const url = String(fd.get("url") ?? "");
    if (!isValidWebsiteUrl(url)) {
      setError(WEBSITE_URL_ERROR);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await createWebsite(clientId, fd);
      if (!result.ok) {
        setError(result.error);
        setPending(false);
        return;
      }
      setWebsiteId(result.websiteId);
      setWebsiteName(String(fd.get("name") ?? ""));
      setConnectorKey(result.connectorKey);
      setPending(false);
      go(2);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  async function onVerify() {
    if (!websiteId || pending) return;
    setPending(true);
    setError(null);
    const result = await checkWebsiteConnection(websiteId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setVerifyStatus(result.status);
    if (result.status === "connected") {
      go(5);
      router.refresh();
    }
  }

  return (
    <div className="-mx-6 -my-[26px] flex min-h-[calc(100vh-50px)] flex-col bg-[#eef1f6]">
      <header className="shrink-0 border-b border-[#dde3ec] bg-white px-6 py-4 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link
              href={"/launchpad" as Route}
              className="text-[12px] font-semibold text-muted hover:text-ink"
            >
              ← Launchpad
            </Link>
            <h1 className="mt-1 text-[22px] font-bold tracking-tight text-ink">
              Setup wizard
            </h1>
            <p className="mt-1 text-[13px] text-muted">
              Step {step + 1} of {WIZARD_STEPS.length} · {progressPercent}% complete
            </p>
          </div>
        </div>

        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-[#e8edf5]"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-400"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <ol className="mt-4 flex gap-1">
          {WIZARD_STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={s.id} className="flex flex-1 flex-col items-center gap-1.5">
                <span
                  className={`grid size-6 place-items-center rounded-full text-[10px] font-bold ${
                    active
                      ? "bg-brand text-white"
                      : done
                        ? "bg-ok text-white"
                        : "bg-[#e8edf5] text-faint"
                  }`}
                >
                  {done ? "✓" : s.number}
                </span>
                <span
                  className={`hidden text-[10px] sm:block ${
                    active ? "font-semibold text-ink" : "text-faint"
                  }`}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>
      </header>

      <div className="flex flex-1 justify-center p-4 sm:p-5 lg:p-6">
        <div className="w-full max-w-xl self-start rounded-2xl border border-[#dde3ec] bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-7">
        {step === 0 && (
          <>
            <h2 className="text-[17px] font-bold text-ink">Add a client</h2>
            <p className="mt-1 mb-4 text-[13px] text-muted">
              One business you work for. Their websites and leads live inside it.
            </p>
            <form onSubmit={onCreateClient}>
              <FormError message={error} />
              <Field
                label="Client name"
                name="name"
                required
                autoFocus
                placeholder="Harbour Dental"
              />
              <Field
                label="Contact email"
                name="contactEmail"
                type="email"
                placeholder="hello@harbourdental.com"
              />
              <Field
                label="Contact phone"
                name="contactPhone"
                placeholder="Optional"
              />
              <SubmitButton pending={pending}>Continue</SubmitButton>
            </form>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="text-[17px] font-bold text-ink">Add their website</h2>
            <p className="mt-1 mb-4 text-[13px] text-muted">
              {clientName
                ? `WordPress site for ${clientName}.`
                : "The WordPress site their leads come from."}
            </p>
            {!clientId ? (
              <p className="text-[13px] text-bad">
                Missing client.{" "}
                <button
                  type="button"
                  className="font-semibold underline"
                  onClick={() => go(0)}
                >
                  Go back
                </button>
              </p>
            ) : (
              <form onSubmit={onCreateWebsite}>
                <FormError message={error} />
                <Field
                  label="Website name"
                  name="name"
                  required
                  autoFocus
                  placeholder="Main site"
                />
                <Field
                  label="Address"
                  name="url"
                  required
                  placeholder="harbourdental.com"
                  inputMode="url"
                  autoComplete="url"
                />
                <p className="mb-3.5 -mt-2 text-[12px] text-muted">
                  A valid domain is required (e.g. harbourdental.com).
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => go(0)}
                    className="rounded-lg border border-line px-4 py-2.5 text-[13px] font-semibold text-ink hover:bg-[#f8fafc]"
                  >
                    Back
                  </button>
                  <div className="flex-1">
                    <SubmitButton pending={pending}>Continue</SubmitButton>
                  </div>
                </div>
              </form>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-[17px] font-bold text-ink">Download the plugin</h2>
            <p className="mt-1 mb-4 text-[13px] text-muted">
              Upload the zip in WordPress, then continue to paste your key.
            </p>
            <div className="mb-4 rounded-xl border border-line bg-[#f7f8fb] px-4 py-3.5">
              <p className="text-[13px] font-semibold text-ink">
                Avonix AI Connector
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                For{" "}
                <b className="font-semibold text-ink">
                  Plugins → Add New → Upload Plugin
                </b>
                .
              </p>
              <button
                type="button"
                disabled={downloadBusy}
                onClick={() => {
                  setDownloadBusy(true);
                  window.location.assign("/api/connector/download");
                  setTimeout(() => setDownloadBusy(false), 1500);
                }}
                className="mt-3 w-full rounded-lg bg-brand py-2.5 text-[14px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
              >
                {downloadBusy ? "Starting download…" : "Download plugin (.zip)"}
              </button>
            </div>
            <ol className="mb-5 list-inside list-decimal space-y-2 text-[13px] text-muted">
              <li>Download the zip.</li>
              <li>
                In WordPress:{" "}
                <b className="text-ink">Plugins → Add New → Upload Plugin</b>.
              </li>
              <li>
                Activate <b className="text-ink">Avonix AI Connector</b>.
              </li>
            </ol>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => go(1)}
                className="rounded-lg border border-line px-4 py-2.5 text-[13px] font-semibold text-ink hover:bg-[#f8fafc]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => go(3)}
                className="flex-1 rounded-lg bg-brand py-2.5 text-[14px] font-semibold text-white hover:bg-brand-dark"
              >
                Continue to connect →
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-[17px] font-bold text-ink">Connect WordPress</h2>
            <p className="mt-1 mb-4 text-[13px] text-muted">
              Paste the key into the plugin and test the connection.
            </p>
            {connectorKey ? (
              <ConnectorKeyPanel value={connectorKey} />
            ) : (
              <div className="mb-4 rounded-xl border border-line bg-[#f7f8fb] p-4 text-[13px] text-muted">
                Key was already shown once. Open{" "}
                <Link
                  href={
                    websiteId && clientId
                      ? (`/clients/${clientId}/websites/${websiteId}/settings` as Route)
                      : ("/launchpad" as Route)
                  }
                  className="font-semibold text-brand hover:underline"
                >
                  website settings
                </Link>{" "}
                to rotate a new key if needed.
              </div>
            )}
            <ol className="mt-4 mb-5 list-inside list-decimal space-y-2 text-[13px] text-muted">
              <li>
                Open <b className="text-ink">Settings → Avonix AI</b> in WordPress.
              </li>
              <li>Paste the connector key.</li>
              <li>
                Set the endpoint to{" "}
                <code className="rounded bg-[#f1f4f8] px-1.5 py-0.5 text-[12px] text-ink">
                  http://127.0.0.1:3000
                </code>{" "}
                on Local WP (Avonix must be running).
              </li>
              <li>
                Press <b className="text-ink">Test connection</b>.
              </li>
            </ol>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => go(2)}
                className="rounded-lg border border-line px-4 py-2.5 text-[13px] font-semibold text-ink hover:bg-[#f8fafc]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => go(4)}
                className="flex-1 rounded-lg bg-brand py-2.5 text-[14px] font-semibold text-white hover:bg-brand-dark"
              >
                I&apos;ve installed it →
              </button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="text-[17px] font-bold text-ink">Verify connection</h2>
            <p className="mt-1 mb-4 text-[13px] text-muted">
              {websiteName
                ? `Check that “${websiteName}” shows as connected.`
                : "Confirm the site is connected in Avonix."}
            </p>
            <FormError message={error} />
            {verifyStatus && verifyStatus !== "connected" ? (
              <div className="mb-4 rounded-xl border border-[#ffd9bd] bg-[#fff8f3] px-4 py-3 text-[13px] text-ink">
                Status is still <b>{verifyStatus}</b>. Finish the plugin test,
                then check again.
              </div>
            ) : null}
            <div className="flex flex-col gap-2">
              <SubmitButton
                type="button"
                pending={pending}
                pendingLabel="Checking…"
                onClick={onVerify}
              >
                Check connection
              </SubmitButton>
              <button
                type="button"
                onClick={() => go(5)}
                className="rounded-lg border border-line py-2.5 text-[13px] font-semibold text-muted hover:bg-[#f8fafc] hover:text-ink"
              >
                Skip for now
              </button>
              <button
                type="button"
                onClick={() => go(3)}
                className="text-[12.5px] font-semibold text-faint hover:text-ink"
              >
                ← Back to connect
              </button>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h2 className="text-[17px] font-bold text-ink">Setup complete</h2>
            <p className="mt-1 mb-4 text-[13px] text-muted">
              {clientName
                ? `${clientName} is ready. Add another client or return to Launchpad.`
                : "You can add another client anytime from Launchpad."}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep(0);
                  setClientId(null);
                  setClientName("");
                  setWebsiteId(null);
                  setWebsiteName("");
                  setConnectorKey(null);
                  setVerifyStatus(null);
                  setError(null);
                  router.replace("/launchpad/setup" as Route);
                }}
                className="block w-full rounded-lg bg-brand py-2.5 text-center text-[14px] font-semibold text-white hover:bg-brand-dark"
              >
                Add another client
              </button>
              <Link
                href={
                  clientId && websiteId
                    ? (`/clients/${clientId}/websites/${websiteId}` as Route)
                    : clientId
                      ? (`/clients/${clientId}` as Route)
                      : ("/launchpad" as Route)
                }
                className="block rounded-lg border border-line py-2.5 text-center text-[14px] font-semibold text-ink hover:bg-[#f8fafc]"
              >
                Open workspace
              </Link>
              <Link
                href={"/launchpad" as Route}
                className="block py-2 text-center text-[13px] font-semibold text-muted hover:text-ink"
              >
                Back to Launchpad
              </Link>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
