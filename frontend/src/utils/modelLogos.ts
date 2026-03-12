/**
 * Provider branding configuration for model logos.
 * Maps provider slug (from modelId "provider/model") to display info.
 *
 * Some hosting providers (evroc, fireworks) serve models from different labs,
 * so we match on model name first, then fall back to provider.
 */

export interface ProviderInfo {
  name: string;
  color: string;
  bgColor: string;
  initial: string;
  logo?: string;
}

/** Model-name prefix → lab info (takes priority over provider) */
const MODEL_LAB_MAP: Array<{ prefix: string; info: ProviderInfo }> = [
  {
    prefix: "glm",
    info: {
      name: "Zhipu AI",
      color: "#1A56DB",
      bgColor: "#EBF0FF",
      initial: "Z",
      logo: "/logos/zai.svg",
    },
  },
  {
    prefix: "kimi",
    info: {
      name: "Moonshot AI",
      color: "#000000",
      bgColor: "#F0F0F0",
      initial: "K",
      logo: "/logos/moonshot.png",
    },
  },
];

const PROVIDER_MAP: Record<string, ProviderInfo> = {
  openai: {
    name: "OpenAI",
    color: "#000000",
    bgColor: "#E8E8E8",
    initial: "O",
    logo: "/logos/openai.svg",
  },
  anthropic: {
    name: "Anthropic",
    color: "#D4A574",
    bgColor: "#FDF6EF",
    initial: "A",
    logo: "/logos/anthropic.svg",
  },
  gcp: {
    name: "Google",
    color: "#4285F4",
    bgColor: "#EBF3FF",
    initial: "G",
    logo: "/logos/google.svg",
  },
  xai: {
    name: "xAI",
    color: "#000000",
    bgColor: "#F0F0F0",
    initial: "X",
    logo: "/logos/xai.png",
  },
  meta: {
    name: "Meta",
    color: "#0668E1",
    bgColor: "#E8F0FE",
    initial: "M",
    logo: "/logos/meta.svg",
  },
  fireworks: {
    name: "Fireworks",
    color: "#FF6B35",
    bgColor: "#FFF0EB",
    initial: "F",
  },
  evroc: {
    name: "Evroc",
    color: "#6B47DC",
    bgColor: "#F3F0FF",
    initial: "E",
  },
  moonshot: {
    name: "Moonshot AI",
    color: "#000000",
    bgColor: "#F0F0F0",
    initial: "K",
    logo: "/logos/moonshot.png",
  },
  groq: {
    name: "Groq",
    color: "#F55036",
    bgColor: "#FEF0ED",
    initial: "G",
  },
  mistral: {
    name: "Mistral",
    color: "#FF7000",
    bgColor: "#FFF3EB",
    initial: "M",
    logo: "/logos/mistral.png",
  },
};

const DEFAULT_PROVIDER: ProviderInfo = {
  name: "AI",
  color: "#6B7280",
  bgColor: "#F3F4F6",
  initial: "?",
};

export function getProviderFromModelId(modelId: string): string {
  return modelId.split("/")[0] ?? "";
}

export function getProviderInfo(modelId: string): ProviderInfo {
  const [provider, ...rest] = modelId.split("/");
  const modelName = rest.join("/") || modelId;

  // Check model name first (handles evroc/glm-5 → Zhipu, fireworks/kimi-* → Moonshot)
  // Use the last path segment for matching (handles groq/moonshotai/kimi-k2-instruct)
  const lastSegment = modelName.split("/").pop() ?? modelName;
  const labMatch = MODEL_LAB_MAP.find(
    (entry) =>
      modelName.startsWith(entry.prefix) ||
      lastSegment.startsWith(entry.prefix)
  );
  if (labMatch) return labMatch.info;

  return PROVIDER_MAP[provider] ?? DEFAULT_PROVIDER;
}
