import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const RUNS_DIR = join(process.cwd(), "..", "runs");

let enabled = false;

export function enableRunLogging() {
  enabled = true;
  console.log(`Run logging enabled → ${RUNS_DIR}`);
}

export function logModelCall(
  sessionId: string,
  roundNum: number,
  modelId: string,
  instructions: string,
  input: Record<string, unknown>,
  output: Record<string, unknown> | null,
  error?: string
): void {
  if (!enabled) return;
  try {
    const sessionDir = join(RUNS_DIR, sessionId);
    mkdirSync(sessionDir, { recursive: true });

    const modelSlug = modelId.replace(/\//g, "-");
    const filename = `round-${roundNum}_${modelSlug}.md`;

    const timestamp = new Date().toISOString();
    let content = `# ${modelId} — Round ${roundNum}\n`;
    content += `Timestamp: ${timestamp}\n\n`;
    content += `## Instructions (system prompt)\n\n${instructions}\n\n`;
    content += `## Input\n\n\`\`\`json\n${JSON.stringify(input, null, 2)}\n\`\`\`\n\n`;

    if (error) {
      content += `## Error\n\n${error}\n`;
    } else if (output) {
      content += `## Response\n\n\`\`\`json\n${JSON.stringify(output, null, 2)}\n\`\`\`\n`;
    }

    writeFileSync(join(sessionDir, filename), content);
  } catch (err) {
    console.error("Failed to write run log:", err);
  }
}

export function logSessionSummary(
  sessionId: string,
  session: {
    question: string;
    models: string[];
    options: Array<{ id: string; label: string }>;
    consensusThreshold: number;
    maxRounds: number;
    status: string;
    winningOption?: string;
    rounds: Array<{
      roundNumber: number;
      voteDistribution: Record<string, number>;
    }>;
  }
): void {
  if (!enabled) return;
  try {
    const sessionDir = join(RUNS_DIR, sessionId);
    mkdirSync(sessionDir, { recursive: true });

    let content = `# Session Summary\n\n`;
    content += `**Question:** ${session.question}\n`;
    content += `**Models:** ${session.models.join(", ")}\n`;
    content += `**Options:** ${session.options.map((o) => `${o.id} (${o.label})`).join(", ")}\n`;
    content += `**Consensus threshold:** ${session.consensusThreshold}/${session.models.length}\n`;
    content += `**Max rounds:** ${session.maxRounds}\n`;
    content += `**Status:** ${session.status}\n`;
    if (session.winningOption) {
      const label = session.options.find((o) => o.id === session.winningOption)?.label;
      content += `**Winner:** ${session.winningOption}${label ? ` (${label})` : ""}\n`;
    }
    content += `**Rounds played:** ${session.rounds.length}\n\n`;

    for (const round of session.rounds) {
      const tally = Object.entries(round.voteDistribution)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      content += `- Round ${round.roundNumber}: ${tally}\n`;
    }

    writeFileSync(join(sessionDir, "_summary.md"), content);
  } catch (err) {
    console.error("Failed to write session summary:", err);
  }
}
