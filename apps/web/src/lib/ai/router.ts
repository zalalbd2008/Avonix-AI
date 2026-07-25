/**
 * AI provider router (ADR-011 §6).
 * Default: OpenRouter. Fallback: Anthropic direct.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { CepAiConfig, CepAiProvider } from "@/lib/db/schema";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type RouterResult =
  | {
      ok: true;
      text: string;
      model: string;
      provider: CepAiProvider;
      inputTokens: number;
      outputTokens: number;
      cachedInputTokens: number;
    }
  | { ok: false; error: string; status: number };

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function resolveConfig(ai?: CepAiConfig | null): Required<
  Pick<CepAiConfig, "provider" | "model" | "temperature" | "maxTokens">
> &
  Pick<CepAiConfig, "fallbackProvider" | "fallbackModel"> {
  return {
    provider: ai?.provider ?? "openrouter",
    model: ai?.model ?? "anthropic/claude-sonnet-4",
    temperature: ai?.temperature ?? 0.3,
    maxTokens: ai?.maxTokens ?? 800,
    fallbackProvider: ai?.fallbackProvider ?? "anthropic",
    fallbackModel: ai?.fallbackModel ?? "claude-sonnet-5",
  };
}

function hasKey(provider: CepAiProvider): boolean {
  switch (provider) {
    case "openrouter":
      return Boolean(process.env.OPENROUTER_API_KEY);
    case "anthropic":
      return Boolean(process.env.ANTHROPIC_API_KEY);
    case "openai":
      return Boolean(process.env.OPENAI_API_KEY);
    case "google":
      return Boolean(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY);
    case "groq":
      return Boolean(process.env.GROQ_API_KEY);
    case "mistral":
      return Boolean(process.env.MISTRAL_API_KEY);
    case "azure_openai":
      return Boolean(
        process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT,
      );
    case "custom_openai":
      return Boolean(
        process.env.CUSTOM_LLM_API_KEY && process.env.CUSTOM_LLM_BASE_URL,
      );
    default:
      return false;
  }
}

/** Which providers are configured in this environment (for studio UI). */
export function configuredAiProviders(): CepAiProvider[] {
  const all: CepAiProvider[] = [
    "openrouter",
    "anthropic",
    "openai",
    "google",
    "mistral",
    "groq",
    "azure_openai",
    "custom_openai",
  ];
  return all.filter(hasKey);
}

export async function completeChat(opts: {
  system: string;
  messages: ChatTurn[];
  ai?: CepAiConfig | null;
}): Promise<RouterResult> {
  const cfg = resolveConfig(opts.ai);
  const chain: Array<{ provider: CepAiProvider; model: string }> = [
    { provider: cfg.provider, model: cfg.model },
  ];
  if (cfg.fallbackProvider && cfg.fallbackProvider !== cfg.provider) {
    chain.push({
      provider: cfg.fallbackProvider,
      model: cfg.fallbackModel || cfg.model,
    });
  }
  // Last resort if neither configured as expected
  if (!chain.some((c) => c.provider === "anthropic") && hasKey("anthropic")) {
    chain.push({ provider: "anthropic", model: "claude-sonnet-5" });
  }
  if (!chain.some((c) => c.provider === "openrouter") && hasKey("openrouter")) {
    chain.unshift({
      provider: "openrouter",
      model: "anthropic/claude-sonnet-4",
    });
  }

  let lastError = "No AI provider is configured.";
  for (const step of chain) {
    if (!hasKey(step.provider)) continue;
    try {
      if (step.provider === "anthropic") {
        return await callAnthropic({
          system: opts.system,
          messages: opts.messages,
          model: step.model,
          maxTokens: cfg.maxTokens,
        });
      }
      // OpenRouter + OpenAI-compatible family
      return await callOpenAiCompatible({
        provider: step.provider,
        system: opts.system,
        messages: opts.messages,
        model: step.model,
        temperature: cfg.temperature,
        maxTokens: cfg.maxTokens,
      });
    } catch (e) {
      console.error(`AI router ${step.provider} failed`, e);
      lastError = "The assistant is unavailable right now.";
    }
  }

  const anyConfigured = configuredAiProviders().length > 0;
  return {
    ok: false,
    error: anyConfigured ? lastError : "AI chat is not configured.",
    status: anyConfigured ? 502 : 503,
  };
}

async function callAnthropic(opts: {
  system: string;
  messages: ChatTurn[];
  model: string;
  maxTokens: number;
}): Promise<RouterResult> {
  const key = process.env.ANTHROPIC_API_KEY!;
  const claude = new Anthropic({ apiKey: key });
  const response = await claude.messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens,
    system: [
      { type: "text", text: opts.system, cache_control: { type: "ephemeral" } },
    ],
    messages: opts.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!text) {
    return { ok: false, error: "The assistant had no answer.", status: 502 };
  }
  return {
    ok: true,
    text,
    model: opts.model,
    provider: "anthropic",
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cachedInputTokens: response.usage.cache_read_input_tokens ?? 0,
  };
}

async function callOpenAiCompatible(opts: {
  provider: CepAiProvider;
  system: string;
  messages: ChatTurn[];
  model: string;
  temperature: number;
  maxTokens: number;
}): Promise<RouterResult> {
  const { url, key, headers } = endpointFor(opts.provider);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...headers,
    },
    body: JSON.stringify({
      model: opts.model,
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      messages: [
        { role: "system", content: opts.system },
        ...opts.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${opts.provider} ${res.status}: ${detail.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    model?: string;
  };
  const text = json.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) {
    return { ok: false, error: "The assistant had no answer.", status: 502 };
  }
  return {
    ok: true,
    text,
    model: json.model || opts.model,
    provider: opts.provider,
    inputTokens: json.usage?.prompt_tokens ?? 0,
    outputTokens: json.usage?.completion_tokens ?? 0,
    cachedInputTokens: 0,
  };
}

function endpointFor(provider: CepAiProvider): {
  url: string;
  key: string;
  headers: Record<string, string>;
} {
  switch (provider) {
    case "openrouter":
      return {
        url: OPENROUTER_URL,
        key: process.env.OPENROUTER_API_KEY!,
        headers: {
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_APP_URL || "https://avonix.ai",
          "X-Title": "Avonix CEP",
        },
      };
    case "openai":
      return {
        url: "https://api.openai.com/v1/chat/completions",
        key: process.env.OPENAI_API_KEY!,
        headers: {},
      };
    case "groq":
      return {
        url: "https://api.groq.com/openai/v1/chat/completions",
        key: process.env.GROQ_API_KEY!,
        headers: {},
      };
    case "mistral":
      return {
        url: "https://api.mistral.ai/v1/chat/completions",
        key: process.env.MISTRAL_API_KEY!,
        headers: {},
      };
    case "google": {
      // OpenAI-compatible Gemini endpoint when using AI Studio key via proxy
      const key = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY!;
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,
        key,
        headers: {},
      };
    }
    case "azure_openai": {
      const endpoint = process.env.AZURE_OPENAI_ENDPOINT!.replace(/\/$/, "");
      const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o";
      const version = process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview";
      return {
        url: `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${version}`,
        key: process.env.AZURE_OPENAI_API_KEY!,
        headers: { "api-key": process.env.AZURE_OPENAI_API_KEY! },
      };
    }
    case "custom_openai":
      return {
        url: `${process.env.CUSTOM_LLM_BASE_URL!.replace(/\/$/, "")}/chat/completions`,
        key: process.env.CUSTOM_LLM_API_KEY!,
        headers: {},
      };
    default:
      throw new Error(`Provider ${provider} is not OpenAI-compatible in router`);
  }
}
