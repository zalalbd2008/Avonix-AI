import type { CepAiProvider } from "@/lib/db/schema/cep";

export const PLATFORM_AI_KEY_PROVIDERS: Array<{
  id: CepAiProvider;
  label: string;
  envHint: string;
  placeholder: string;
}> = [
  {
    id: "openrouter",
    label: "OpenRouter",
    envHint: "OPENROUTER_API_KEY",
    placeholder: "sk-or-…",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    envHint: "ANTHROPIC_API_KEY",
    placeholder: "sk-ant-…",
  },
  {
    id: "openai",
    label: "OpenAI",
    envHint: "OPENAI_API_KEY",
    placeholder: "sk-…",
  },
  {
    id: "google",
    label: "Google AI / Gemini",
    envHint: "GOOGLE_AI_API_KEY",
    placeholder: "AIza…",
  },
  {
    id: "groq",
    label: "Groq",
    envHint: "GROQ_API_KEY",
    placeholder: "gsk_…",
  },
  {
    id: "mistral",
    label: "Mistral",
    envHint: "MISTRAL_API_KEY",
    placeholder: "…",
  },
  {
    id: "azure_openai",
    label: "Azure OpenAI",
    envHint: "AZURE_OPENAI_API_KEY",
    placeholder: "…",
  },
  {
    id: "custom_openai",
    label: "Custom OpenAI-compatible",
    envHint: "CUSTOM_LLM_API_KEY",
    placeholder: "…",
  },
];

export type AiKeyStatus = {
  provider: CepAiProvider;
  label: string;
  envHint: string;
  inDb: boolean;
  inEnv: boolean;
  source: "platform" | "env" | "none";
};
