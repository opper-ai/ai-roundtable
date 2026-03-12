import { ModelCircle } from "./ModelCircle";
import type { RoundtableSession } from "../types";

interface RoundtableCanvasProps {
  session: RoundtableSession;
  thinkingModels: Set<string>;
  displayRound?: number; // 1-based; undefined = show latest
}

export function RoundtableCanvas({
  session,
  thinkingModels,
  displayRound,
}: RoundtableCanvasProps) {
  const models = session.models;
  const n = models.length;

  // Dynamic sizing based on model count
  const circleSize = n <= 4 ? 80 : n <= 6 ? 64 : n <= 9 ? 52 : 44;
  const minRadius = Math.max(140, ((circleSize + 40) * n) / (2 * Math.PI));
  // Extra padding for labels + vote badges overflowing the circles
  const overflow = 20;
  const canvasSize = (minRadius + circleSize) * 2 + overflow * 2;
  const centerX = canvasSize / 2;
  const centerY = canvasSize / 2;

  // Find responses up to the displayRound (or all rounds if not set)
  const effectiveRound = displayRound ?? session.rounds.length;
  const latestResponses = new Map<string, (typeof session.rounds)[0]["responses"][0]>();
  for (const round of session.rounds) {
    if (round.roundNumber > effectiveRound) break;
    for (const response of round.responses) {
      latestResponses.set(response.modelId, response);
    }
  }

  const positions = models.map((_, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return {
      x: centerX + minRadius * Math.cos(angle),
      y: centerY + minRadius * Math.sin(angle),
    };
  });
  return (
    <div className="relative" style={{ width: canvasSize, height: canvasSize }}>
      {models.map((modelId, i) => {
        const pos = positions[i];
        const label = modelId.split("/").pop() ?? modelId;
        const response = latestResponses.get(modelId);

        return (
          <ModelCircle
            key={modelId}
            modelId={modelId}
            label={label}
            latestResponse={response}
            isThinking={thinkingModels.has(modelId)}
            x={pos.x}
            y={pos.y}
            size={circleSize}
          />
        );
      })}
    </div>
  );
}
