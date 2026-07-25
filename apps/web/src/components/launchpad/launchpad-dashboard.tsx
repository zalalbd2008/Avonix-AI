"use client";

import Link from "next/link";
import type { Route } from "next";
import {
  LAUNCHPAD_STEPS,
  pickSetupTarget,
  type LaunchpadClient,
  type LaunchpadSnapshot,
} from "@/lib/launchpad/steps";

function wizardHref(opts: {
  homeStep?: number;
  clientId?: string;
  websiteId?: string;
}): Route {
  const params = new URLSearchParams();
  if (opts.homeStep) params.set("step", String(opts.homeStep));
  if (opts.clientId) params.set("client", opts.clientId);
  if (opts.websiteId) params.set("website", opts.websiteId);
  const q = params.toString();
  return (q ? `/launchpad/setup?${q}` : "/launchpad/setup") as Route;
}

function stepStatus(
  stepNumber: number,
  snapshot: LaunchpadSnapshot,
): "done" | "current" | "upcoming" {
  const { clientCount, websiteCount, connectedCount, pendingCount, nextStepNumber } =
    snapshot;

  const done =
    (stepNumber === 1 && clientCount > 0) ||
    (stepNumber === 2 && websiteCount > 0) ||
    (stepNumber === 3 && connectedCount > 0) ||
    (stepNumber === 4 && pendingCount === 0 && websiteCount > 0);

  if (done) return "done";

  const blocked =
    (stepNumber === 2 && clientCount === 0) ||
    (stepNumber >= 3 && websiteCount === 0);

  if (blocked) return "upcoming";
  if (
    stepNumber === nextStepNumber ||
    (nextStepNumber >= 3 && stepNumber >= 3 && stepNumber <= 4)
  ) {
    return "current";
  }
  return "upcoming";
}

const card =
  "rounded-2xl border border-[#dde3ec] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]";

/**
 * Full-page Launchpad — matches Settings / Agency Data surface:
 * edge-to-edge canvas, white header, card grid below.
 */
export function LaunchpadDashboard({ snapshot }: { snapshot: LaunchpadSnapshot }) {
  const { progressPercent, nextStepNumber, clients } = snapshot;
  const complete = nextStepNumber > 4;
  const setupTarget = pickSetupTarget(snapshot);
  const pendingSite = setupTarget?.websites.find((w) => w.status !== "connected");

  const primarySetupHref = wizardHref(
    complete
      ? {}
      : nextStepNumber <= 1
        ? { homeStep: 1 }
        : nextStepNumber === 2 && setupTarget
          ? { homeStep: 2, clientId: setupTarget.id }
          : pendingSite && setupTarget
            ? {
                homeStep: nextStepNumber,
                clientId: setupTarget.id,
                websiteId: pendingSite.id,
              }
            : setupTarget
              ? { homeStep: nextStepNumber, clientId: setupTarget.id }
              : { homeStep: 1 },
  );

  const metrics = [
    { value: String(snapshot.clientCount), label: "Clients", tone: "" },
    { value: String(snapshot.websiteCount), label: "Websites", tone: "" },
    {
      value: String(snapshot.connectedCount),
      label: "Connected",
      tone: "text-ok",
    },
    {
      value: String(snapshot.pendingCount),
      label: "Pending",
      tone: snapshot.pendingCount > 0 ? "text-warn" : "text-faint",
    },
  ];

  return (
    <div className="-mx-6 -my-[26px] flex min-h-[calc(100vh-50px)] flex-col bg-[#eef1f6]">
      <header className="shrink-0 border-b border-[#dde3ec] bg-white px-6 py-4 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
              Launchpad
            </p>
            <h1 className="mt-0.5 text-[22px] font-bold tracking-tight text-ink">
              Step-by-step configuration
            </h1>
            <p className="mt-1 max-w-2xl text-[13px] text-muted">
              Connect clients and WordPress sites in order — then add more anytime.
            </p>
          </div>
          <Link
            href={primarySetupHref}
            className="inline-flex rounded-lg bg-brand px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-brand-dark"
          >
            {complete ? "Start new setup" : "Continue setup"}
          </Link>
        </div>
      </header>

      <div className="flex-1 p-4 sm:p-5 lg:p-6">
        {/* Metrics */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className={`${card} px-4 pt-4 pb-3.5`}>
              <div className={`text-2xl font-bold tracking-tight text-ink ${m.tone}`}>
                {m.value}
              </div>
              <div className="mt-[3px] text-[12.5px] text-muted">{m.label}</div>
            </div>
          ))}
        </div>

        <div className="grid w-full gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.9fr)] lg:items-start">
          {/* Left: progress + steps */}
          <div className="flex flex-col gap-5">
            <section className={`${card} p-6 sm:p-7`}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-[17px] font-bold text-ink">Setup progress</h2>
                  <p className="mt-1 text-[13px] text-muted">
                    {complete
                      ? "All current sites are connected."
                      : `Step ${Math.min(nextStepNumber, 4)} of 4 — continue in the wizard`}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[28px] font-bold tracking-tight text-ink">
                    {progressPercent}%
                  </div>
                  <div className="text-[11.5px] text-faint">complete</div>
                </div>
              </div>

              <div
                className="mt-5 h-2.5 overflow-hidden rounded-full bg-[#e8edf5]"
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Setup progress"
              >
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Horizontal step rail */}
              <ol className="mt-6 flex gap-2">
                {LAUNCHPAD_STEPS.map((step) => {
                  const status = stepStatus(step.number, snapshot);
                  return (
                    <li key={step.id} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                      <span
                        className={`grid size-7 place-items-center rounded-full text-[11px] font-bold ${
                          status === "done"
                            ? "bg-ok text-white"
                            : status === "current"
                              ? "bg-brand text-white"
                              : "bg-[#e8edf5] text-faint"
                        }`}
                      >
                        {status === "done" ? "✓" : step.number}
                      </span>
                      <span
                        className={`w-full truncate text-center text-[11px] ${
                          status === "current"
                            ? "font-semibold text-ink"
                            : "text-faint"
                        }`}
                      >
                        {step.title.replace(/^Add a |^Connect a |^Install the |^Verify /, "")}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>

            <section className={`${card} overflow-hidden`}>
              <div className="border-b border-[#edf0f5] px-6 py-4 sm:px-7">
                <h2 className="text-[17px] font-bold text-ink">Configuration steps</h2>
                <p className="mt-0.5 text-[12.5px] text-muted">
                  Start each step in the guided wizard
                </p>
              </div>
              <ol>
                {LAUNCHPAD_STEPS.map((step, i) => {
                  const status = stepStatus(step.number, snapshot);
                  const href = wizardHref({
                    homeStep: step.number,
                    clientId: step.number >= 2 ? setupTarget?.id : undefined,
                    websiteId: step.number >= 3 ? pendingSite?.id : undefined,
                  });

                  return (
                    <li
                      key={step.id}
                      className={`flex flex-wrap items-start gap-4 px-6 py-4 sm:px-7 ${
                        i < LAUNCHPAD_STEPS.length - 1 ? "border-b border-[#f1f4f8]" : ""
                      } ${status === "current" ? "bg-[rgba(13,148,136,0.04)]" : ""}`}
                    >
                      <span
                        className={`grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold ${
                          status === "done"
                            ? "bg-ok text-white"
                            : status === "current"
                              ? "bg-brand text-white"
                              : "bg-[#e8edf5] text-faint"
                        }`}
                      >
                        {status === "done" ? "✓" : step.number}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[14.5px] font-semibold text-ink">
                            {step.title}
                          </h3>
                          {status === "current" ? (
                            <span className="rounded-full bg-[rgba(13,148,136,0.1)] px-2 py-0.5 text-[10.5px] font-semibold text-brand">
                              Current
                            </span>
                          ) : null}
                          {status === "done" ? (
                            <span className="rounded-full bg-[rgba(16,185,129,0.1)] px-2 py-0.5 text-[10.5px] font-semibold text-ok">
                              Done
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-[13px] leading-relaxed text-muted">
                          {step.description}
                        </p>
                      </div>

                      <div className="shrink-0 self-center">
                        {status === "upcoming" ? (
                          <span className="inline-flex rounded-lg bg-[#f1f4f8] px-3.5 py-2 text-[12.5px] font-semibold text-faint">
                            Locked
                          </span>
                        ) : status === "done" ? (
                          <Link
                            href={
                              step.number <= 2
                                ? wizardHref({
                                    homeStep: step.number,
                                    clientId:
                                      step.number === 2 ? setupTarget?.id : undefined,
                                  })
                                : ("/launchpad/setup" as Route)
                            }
                            className="inline-flex rounded-lg border border-[#d0d7e3] px-3.5 py-2 text-[12.5px] font-semibold text-ink hover:bg-[#f8fafc]"
                          >
                            {step.number <= 2 ? "Add another" : "Open wizard"}
                          </Link>
                        ) : (
                          <Link
                            href={href}
                            className="inline-flex rounded-lg bg-brand px-3.5 py-2 text-[12.5px] font-semibold text-white hover:bg-brand-dark"
                          >
                            Start step
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>

          {/* Right: clients */}
          <section className={`${card} overflow-hidden`}>
            <div className="flex items-center border-b border-[#edf0f5] px-5 py-4">
              <div>
                <h2 className="text-[17px] font-bold text-ink">Your clients</h2>
                <p className="mt-0.5 text-[12.5px] text-muted">Multi-site setup status</p>
              </div>
              <Link
                href={wizardHref({ homeStep: 1 })}
                className="ml-auto text-[12.5px] font-semibold text-brand hover:underline"
              >
                + New
              </Link>
            </div>

            {clients.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-[13.5px] font-medium text-ink">No clients yet</p>
                <p className="mt-1 text-[12.5px] text-muted">
                  Open the wizard to add your first business and website.
                </p>
                <Link
                  href={wizardHref({ homeStep: 1 })}
                  className="mt-4 inline-flex rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
                >
                  Start setup
                </Link>
              </div>
            ) : (
              <ul>
                {clients.map((client) => (
                  <ClientSetupRow key={client.id} client={client} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ClientSetupRow({ client }: { client: LaunchpadClient }) {
  const connected = client.websites.filter((w) => w.status === "connected").length;
  const total = client.websites.length;
  const pending = client.websites.find((w) => w.status !== "connected");

  let label = "No website yet";
  let ctaHref: Route = wizardHref({ homeStep: 2, clientId: client.id });
  let cta = "Add website";

  if (total > 0 && connected === total) {
    label = `${connected}/${total} connected`;
    ctaHref = `/clients/${client.id}` as Route;
    cta = "Open";
  } else if (total > 0 && pending) {
    label = `${connected}/${total} connected · ${total - connected} pending`;
    ctaHref = wizardHref({
      homeStep: 3,
      clientId: client.id,
      websiteId: pending.id,
    });
    cta = "Finish setup";
  }

  const pct = total === 0 ? 0 : Math.round((connected / total) * 100);

  return (
    <li className="border-b border-[#f1f4f8] px-5 py-4 last:border-0">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-9 place-items-center rounded-lg bg-navy text-[13px] font-semibold text-white">
          {client.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <Link
            href={`/clients/${client.id}` as Route}
            className="text-[13.5px] font-semibold text-ink hover:underline"
          >
            {client.name}
          </Link>
          <p className="text-[12px] text-muted">{label}</p>
        </div>
        <Link
          href={ctaHref}
          className="rounded-lg border border-[#d0d7e3] px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-[#f8fafc]"
        >
          {cta}
        </Link>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e8edf5]">
        <div
          className={`h-full rounded-full ${pct === 100 ? "bg-ok" : "bg-brand"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </li>
  );
}
