/**
 * Lightweight intent / urgency / interest from form + AI signals.
 * Powers Phase 3+ “AI Decision Layer” without requiring an extra LLM call.
 */

export type LeadIntent =
  | "quote"
  | "appointment"
  | "contact"
  | "support"
  | "purchase"
  | "other";

export type LeadUrgency = "low" | "medium" | "high";
export type LeadInterest = "cold" | "warm" | "hot";

export type LeadDecision = {
  intent: LeadIntent;
  urgency: LeadUrgency;
  interest: LeadInterest;
  reasons: string[];
};

export type DecisionInput = {
  values?: Record<string, unknown>;
  message?: string | null;
  formName?: string | null;
  aiScore?: number | null;
  aiCategory?: string | null;
  budgetThreshold?: number;
};

function dig(values: Record<string, unknown> | undefined, keys: string[]): string {
  if (!values) return "";
  for (const key of keys) {
    for (const [k, v] of Object.entries(values)) {
      if (k.toLowerCase() === key.toLowerCase() && v != null) {
        const s = String(v).trim();
        if (s) return s;
      }
    }
  }
  return "";
}

export function parseBudgetNumber(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function decideLead(input: DecisionInput): LeadDecision {
  const reasons: string[] = [];
  const blob = [
    input.formName ?? "",
    input.message ?? "",
    input.aiCategory ?? "",
    dig(input.values, ["service", "services", "message", "details", "notes"]),
    dig(input.values, ["intent", "type", "request"]),
  ]
    .join(" ")
    .toLowerCase();

  let intent: LeadIntent = "contact";
  if (
    /\b(appoint|book|schedule|slot|consultation|visit)\b/.test(blob) ||
    dig(input.values, ["appointment", "date", "slot"])
  ) {
    intent = "appointment";
    reasons.push("Appointment language in form");
  } else if (/\b(quote|estimate|pricing|proposal|bid)\b/.test(blob)) {
    intent = "quote";
    reasons.push("Quote / estimate intent");
  } else if (/\b(buy|purchase|order|checkout|cart)\b/.test(blob)) {
    intent = "purchase";
    reasons.push("Purchase intent");
  } else if (/\b(help|support|issue|broken|error|complaint)\b/.test(blob)) {
    intent = "support";
    reasons.push("Support intent");
  } else if (/\b(contact|reach|call me|get in touch)\b/.test(blob)) {
    intent = "contact";
    reasons.push("General contact");
  } else {
    reasons.push("Default contact intent");
  }

  const budgetRaw = dig(input.values, ["budget", "budget_range", "price"]);
  const budget = parseBudgetNumber(budgetRaw);
  const score = input.aiScore ?? 0;

  let urgency: LeadUrgency = "medium";
  if (/\b(urgent|asap|today|emergency|immediately)\b/.test(blob) || score >= 80) {
    urgency = "high";
    reasons.push("High urgency signals");
  } else if (/\b(whenever|no rush|later|next month)\b/.test(blob) || score < 35) {
    urgency = "low";
    reasons.push("Low urgency signals");
  }

  let interest: LeadInterest = "warm";
  const threshold = input.budgetThreshold && input.budgetThreshold > 0
    ? input.budgetThreshold
    : 5000;
  if ((budget != null && budget >= threshold) || score >= 75) {
    interest = "hot";
    reasons.push(
      budget != null && budget >= threshold
        ? `Budget ≥ ${threshold}`
        : `Lead score ${score}`,
    );
  } else if (score < 40 && (budget == null || budget < threshold / 5)) {
    interest = "cold";
    reasons.push("Low score / budget");
  }

  return { intent, urgency, interest, reasons };
}

/** Which actions AI prefers to keep / prioritize for this decision. */
export function preferActionsForDecision(
  decision: LeadDecision,
  actions: string[],
): string[] {
  const set = new Set(actions);
  const boost: string[] = [];

  if (decision.interest === "hot" || decision.urgency === "high") {
    boost.push("notify_email", "assign_sales", "open_conversation", "score_lead");
  }
  if (decision.intent === "quote" || decision.intent === "appointment") {
    boost.push("thank_you_email", "save_crm", "schedule_follow_up");
  }
  if (decision.interest === "cold") {
    // Keep nurture path; drop aggressive sales assign if present alone isn't required
    return actions.filter((a) => a !== "assign_sales" || decision.urgency === "high");
  }

  // Stable order: boosted first, then the rest
  const ordered = [
    ...boost.filter((a) => set.has(a)),
    ...actions.filter((a) => !boost.includes(a)),
  ];
  return Array.from(new Set(ordered));
}
