import type { RoundtableSession } from "../types";
import { getVoteColor } from "./VoteChip";

interface StatusBarProps {
  session: RoundtableSession;
  displayRound?: number; // 1-based; undefined = latest
}

export function StatusBar({ session, displayRound }: StatusBarProps) {
  const roundIndex = displayRound
    ? session.rounds.findIndex((r) => r.roundNumber === displayRound)
    : session.rounds.length - 1;
  const currentRound = roundIndex >= 0 ? session.rounds[roundIndex] : undefined;
  const dist = currentRound?.voteDistribution ?? {};
  const totalVotes = Object.values(dist).reduce((a, b) => a + b, 0);

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          Round {displayRound ?? session.rounds.length} / {session.maxRounds}
        </span>
        <span>
          {session.status === "consensus" && (
            <span className="font-semibold text-emerald-600">
              Consensus: {session.winningOption}
              {(() => {
                const label = session.options.find(o => o.id === session.winningOption)?.label;
                return label && label !== session.winningOption ? ` (${label})` : "";
              })()}
            </span>
          )}
          {session.status === "max_rounds" && (
            <span className="text-amber-600">Max rounds reached</span>
          )}
          {session.status === "running" && (
            <span className="text-[#3C3CAF]">Deliberating...</span>
          )}
          {session.status === "error" && (
            <span className="text-red-500">Error</span>
          )}
        </span>
      </div>

      {/* Vote distribution bar */}
      {totalVotes > 0 && (
        <div className="flex h-8 overflow-hidden rounded-xl bg-gray-100">
          {Object.entries(dist).map(([optionId, count]) => {
            const pct = (count / totalVotes) * 100;
            return (
              <div
                key={optionId}
                className="flex items-center justify-center text-xs font-bold text-white transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: getVoteColor(optionId),
                }}
              >
                {pct > 20
                  ? `${optionId}: ${count}`
                  : count > 0
                    ? optionId
                    : ""}
              </div>
            );
          })}
        </div>
      )}

      {/* Text breakdown */}
      {totalVotes > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
          {Object.entries(dist).map(([optionId, count]) => {
            const label = session.options.find((o) => o.id === optionId)?.label;
            return (
              <span key={optionId}>
                <span style={{ color: getVoteColor(optionId) }} className="font-semibold">
                  {optionId}
                </span>
                {label && label !== optionId && (
                  <span className="text-gray-400"> ({label})</span>
                )}
                : {count}
              </span>
            );
          })}
        </div>
      )}

      {/* Consensus threshold indicator */}
      <div className="text-center text-[10px] text-gray-400">
        Need {session.consensusThreshold} of {session.models.length} to reach
        consensus
      </div>
    </div>
  );
}
