/**
 * Provider branding configuration for model logos.
 * Maps provider slug (from modelId "provider/model") to display info.
 */

export interface ProviderInfo {
  name: string;
  color: string;
  bgColor: string;
  initial: string;
}

const PROVIDER_MAP: Record<string, ProviderInfo> = {
  openai: {
    name: "OpenAI",
    color: "#000000",
    bgColor: "#E8E8E8",
    initial: "O",
  },
  anthropic: {
    name: "Anthropic",
    color: "#D4A574",
    bgColor: "#FDF6EF",
    initial: "A",
  },
  gcp: {
    name: "Google",
    color: "#4285F4",
    bgColor: "#EBF3FF",
    initial: "G",
  },
  xai: {
    name: "xAI",
    color: "#000000",
    bgColor: "#F0F0F0",
    initial: "X",
  },
  meta: {
    name: "Meta",
    color: "#0668E1",
    bgColor: "#E8F0FE",
    initial: "M",
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
  mistral: {
    name: "Mistral",
    color: "#FF7000",
    bgColor: "#FFF3EB",
    initial: "M",
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
  const provider = getProviderFromModelId(modelId);
  return PROVIDER_MAP[provider] ?? DEFAULT_PROVIDER;
}
