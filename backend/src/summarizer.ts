import type { LLMClient } from "./llm-client.js";
import type { RoundtableSession, Round, RoundSummary, FinalSummary } from "./types.js";
import { roundSummaryJsonSchema, finalSummaryJsonSchema } from "./schemas.js";

const SUMMARY_MODEL = "gcp/gemini-3-pro-preview";

export async function generateRoundSummary(
  session: RoundtableSession,
  round: Round,
  client: LLMClient,
  traceId?: string
): Promise<RoundSummary> {
  const optionList = session.options
    .map((o) => `${o.id}: ${o.label}`)
    .join(", ");

  const responseSummaries = round.responses
    .map((r) => {
      const changed = r.voteChanged
        ? ` (CHANGED${r.attributedTo ? `, convinced by ${r.attributedTo}` : ""})`
        : "";
      return `- ${r.modelLabel} voted ${r.vote}${changed}: ${r.reasoning.slice(0, 300)}`;
    })
    .join("\n");

  const instructions = `You are summarizing round ${round.roundNumber} of an AI roundtable debate.

Question: ${session.question}
Options: ${optionList}

Round ${round.roundNumber} responses:
${responseSummaries}

Provide a concise summary of this round: the key arguments, any vote changes, the vote tally, and your outlook on whether consensus is likely.`;

  const result = await client.call({
    name: "summarize",
    model: SUMMARY_MODEL,
    instructions,
    input: { roundNumber: round.roundNumber },
    outputSchema: roundSummaryJsonSchema as Record<string, unknown>,
    traceContext: traceId
      ? {
          parentId: traceId,
          name: `summary/round-${round.roundNumber}`,
          tags: { session: session.id, type: "round_summary" },
        }
      : undefined,
  });

  return result.result as unknown as RoundSummary;
}

export async function generateFinalSummary(
  session: RoundtableSession,
  client: LLMClient,
  traceId?: string
): Promise<FinalSummary> {
  const optionList = session.options
    .map((o) => `${o.id}: ${o.label}`)
    .join(", ");

  const roundSummaries = session.rounds
    .map((round) => {
      const tally = Object.entries(round.voteDistribution)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      const responses = round.responses
        .map((r) => {
          const changed = r.voteChanged ? ` (CHANGED${r.attributedTo ? `, convinced by ${r.attributedTo.split("/").pop()}` : ""})` : "";
          return `  - ${r.modelLabel} → ${r.vote}${changed}: ${r.reasoning.slice(0, 200)}`;
        })
        .join("\n");
      return `Round ${round.roundNumber} [${tally}]:\n${responses}`;
    })
    .join("\n\n");

  const statusStr =
    session.status === "consensus"
      ? `Consensus reached on ${session.winningOption} in round ${session.rounds.length}`
      : `No consensus after ${session.rounds.length} rounds`;

  const modelNames = session.models.map((m) => m.split("/").pop()).join(", ");

  const instructions = `You are writing the final summary of an AI ${session.mode === "expert_panel" ? "expert panel" : "roundtable debate"}.

Question: ${session.question}
Options: ${optionList}
Models: ${modelNames}
Result: ${statusStr}

Full deliberation:
${roundSummaries}

Write a final summary that specifically references each model by name. For each model, describe what they voted for, whether they changed their mind, and if so, which model's argument convinced them. Be specific about individual model decisions rather than abstracting away the participants.

Include the strongest argument made for each option, and identify key turning points where specific models influenced the outcome.

Also provide a modelDecisions array with each model's final position and whether they changed their mind.`;

  const result = await client.call({
    name: "summarize",
    model: SUMMARY_MODEL,
    instructions,
    input: { sessionId: session.id },
    outputSchema: finalSummaryJsonSchema as Record<string, unknown>,
    traceContext: traceId
      ? {
          parentId: traceId,
          name: `summary/final`,
          tags: { session: session.id, type: "final_summary" },
        }
      : undefined,
  });

  return result.result as unknown as FinalSummary;
}
