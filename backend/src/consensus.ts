import type { Round } from "./types.js";

export function checkConsensus(
  round: Round,
  threshold: number
): string | null {
  for (const [optionId, count] of Object.entries(round.voteDistribution)) {
    if (count >= threshold) return optionId;
  }
  return null;
}
