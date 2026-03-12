import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Markdown from "react-markdown";
import { VoteChip, getVoteBgColor, getVoteTextColor } from "./VoteChip";
import type { RoundtableSession } from "../types";

function generateMarkdown(session: RoundtableSession): string {
  const optionsStr = session.options.map(o => `${o.id} (${o.label})`).join(", ");
  const modelsStr = session.models.map(m => m.split("/").pop() ?? m).join(", ");

  let md = `# AI Roundtable: ${session.question}\n`;
  md += `Options: ${optionsStr}\n`;
  md += `Models: ${modelsStr}\n`;
  md += `Consensus threshold: ${session.consensusThreshold}/${session.models.length}\n`;

  for (const round of session.rounds) {
    md += `\n## Round ${round.roundNumber}\n`;
    for (const resp of round.responses) {
      const label = resp.modelLabel || (resp.modelId.split("/").pop() ?? resp.modelId);
      let header = `### ${label} → ${resp.vote}`;
      if (resp.voteChanged) {
        header += ` (changed`;
        if (resp.attributedTo) {
          header += `, convinced by ${resp.attributedTo.split("/").pop()}`;
        }
        header += `)`;
      }
      md += `\n${header}\n\n${resp.reasoning}\n`;
    }
    if (round.completedAt) {
      const tally = Object.entries(round.voteDistribution)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      md += `\nVote tally: ${tally}\n`;
    }

    // Include round summary if available
    const roundSummary = session.roundSummaries?.[round.roundNumber];
    if (roundSummary) {
      md += `\n### Round ${round.roundNumber} Summary\n`;
      md += `Key arguments:\n`;
      for (const arg of roundSummary.keyArguments) {
        md += `- ${arg}\n`;
      }
      if (roundSummary.voteChanges.length > 0) {
        md += `\nVote changes:\n`;
        for (const change of roundSummary.voteChanges) {
          md += `- ${change}\n`;
        }
      }
      md += `\n${roundSummary.outlook}\n`;
    }
  }

  // Final summary
  if (session.finalSummary) {
    md += `\n## Final Summary\n\n${session.finalSummary.narrative}\n`;
    md += `\n### Strongest Arguments Per Option\n`;
    for (const [optId, arg] of Object.entries(session.finalSummary.strongestPerOption)) {
      const label = session.options.find(o => o.id === optId)?.label ?? optId;
      md += `- **${optId} (${label})**: ${arg}\n`;
    }
    if (session.finalSummary.keyTurningPoints.length > 0) {
      md += `\n### Key Turning Points\n`;
      for (const point of session.finalSummary.keyTurningPoints) {
        md += `- ${point}\n`;
      }
    }
  }

  if (session.status === "consensus" && session.winningOption) {
    const winLabel = session.options.find(o => o.id === session.winningOption)?.label;
    const winStr = winLabel && winLabel !== session.winningOption
      ? `${session.winningOption} (${winLabel})`
      : session.winningOption;
    md += `\n## Result: Consensus on ${winStr} in round ${session.rounds.length}\n`;
  } else if (session.status === "max_rounds") {
    md += `\n## Result: No consensus reached after ${session.rounds.length} rounds\n`;
  }

  return md;
}

function downloadTranscript(session: RoundtableSession) {
  const md = generateMarkdown(session);
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `roundtable-${session.id.slice(0, 8)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

interface TranscriptPanelProps {
  session: RoundtableSession;
  scrollToRound?: number | null;
  onScrollHandled?: () => void;
}

export function TranscriptPanel({ session, scrollToRound, onScrollHandled }: TranscriptPanelProps) {
  const rounds = [...session.rounds].reverse();
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());
  const roundRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const prevRoundCount = useRef(0);

  // Auto-expand latest round, collapse previous when new round arrives
  useEffect(() => {
    const count = session.rounds.length;
    if (count > prevRoundCount.current) {
      setExpandedRounds(new Set([count]));
    }
    prevRoundCount.current = count;
  }, [session.rounds.length]);

  // Handle scroll-to-round from slider
  useEffect(() => {
    if (scrollToRound != null) {
      setExpandedRounds((prev) => new Set([...prev, scrollToRound]));
      // Wait a tick for the expand animation to start, then scroll
      requestAnimationFrame(() => {
        const el = roundRefs.current.get(scrollToRound);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
      onScrollHandled?.();
    }
  }, [scrollToRound, onScrollHandled]);

  const toggleRound = useCallback((roundNumber: number) => {
    setExpandedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(roundNumber)) {
        next.delete(roundNumber);
      } else {
        next.add(roundNumber);
      }
      return next;
    });
  }, []);

  const setRoundRef = useCallback((roundNumber: number, el: HTMLDivElement | null) => {
    if (el) {
      roundRefs.current.set(roundNumber, el);
    } else {
      roundRefs.current.delete(roundNumber);
    }
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {session.rounds.length > 0 && (
        <button
          className="self-end rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
          onClick={() => downloadTranscript(session)}
        >
          Download Transcript
        </button>
      )}

      {/* Final summary loading */}
      {!session.finalSummary &&
        (session.status === "consensus" || session.status === "max_rounds") && (
        <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <svg
            className="h-4 w-4 animate-spin text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-xs text-gray-500">Generating final summary...</span>
        </div>
      )}

      {/* Final summary */}
      {session.finalSummary && (
        <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-[#8CECF2]/5 to-[#FFB186]/5 p-4">
          <h3 className="mb-2 text-sm font-semibold text-[#1B2E40]">Final Summary</h3>
          <p className="mb-4 text-sm leading-relaxed text-gray-700">
            {session.finalSummary.narrative}
          </p>

          {/* Strongest arguments per option */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Strongest arguments</h4>
            {Object.entries(session.finalSummary.strongestPerOption).map(([optId, arg]) => (
              <div key={optId} className="flex gap-3 text-xs">
                <span
                  className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                  style={{ backgroundColor: getVoteBgColor(optId), color: getVoteTextColor(optId) }}
                >
                  {optId}
                </span>
                <span className="text-gray-600">{arg}</span>
              </div>
            ))}
          </div>

          {/* Key turning points */}
          {session.finalSummary.keyTurningPoints.length > 0 && (
            <div className="mt-4 space-y-1">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Key turning points</h4>
              {session.finalSummary.keyTurningPoints.map((point, i) => (
                <p key={i} className="text-xs text-gray-500">— {point}</p>
              ))}
            </div>
          )}

          {/* Model decisions — table grid */}
          {session.finalSummary.modelDecisions && session.finalSummary.modelDecisions.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Model decisions</h4>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-white">
                {session.finalSummary.modelDecisions.map((decision, i) => (
                  <div key={i} className="flex items-start gap-3 px-3 py-2.5">
                    {/* Vote badge */}
                    <span
                      className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{ backgroundColor: getVoteBgColor(decision.finalPosition), color: getVoteTextColor(decision.finalPosition) }}
                    >
                      {decision.finalPosition}
                    </span>
                    {/* Model name + reasoning */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#1B2E40]">{decision.model}</span>
                        {decision.changedMind && (
                          <span className="rounded-full bg-[#FFB186]/20 px-1.5 py-0.5 text-[10px] font-medium text-[#6B3A1A]">
                            changed mind{decision.influencedBy ? ` · ${decision.influencedBy}` : ""}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{decision.reasoning}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {rounds.map((round) => {
        const isExpanded = expandedRounds.has(round.roundNumber);
        const tallyStr = round.completedAt
          ? Object.entries(round.voteDistribution)
              .map(([k, v]) => {
                const label = session.options.find(o => o.id === k)?.label;
                return label && label !== k ? `${k} (${label}): ${v}` : `${k}: ${v}`;
              })
              .join(" | ")
          : "";
        const roundSummary = session.roundSummaries?.[round.roundNumber];

        return (
          <div
            key={round.roundNumber}
            ref={(el) => setRoundRef(round.roundNumber, el)}
            className="rounded-xl border border-gray-200 bg-white"
          >
            {/* Clickable header */}
            <button
              className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 transition-colors rounded-xl"
              onClick={() => toggleRound(round.roundNumber)}
            >
              <span
                className="text-[10px] text-gray-400 transition-transform"
                style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
              >
                ▶
              </span>
              <span className="text-sm font-semibold text-[#1B2E40]">
                Round {round.roundNumber}
              </span>
              {tallyStr && (
                <span className="text-xs font-normal text-gray-400">
                  {tallyStr}
                </span>
              )}
            </button>

            {/* Collapsible content */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-3 px-4 pb-4">
                    {round.responses.map((resp) => (
                      <div
                        key={resp.modelId}
                        className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                      >
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-600">
                            {resp.modelLabel}
                          </span>
                          <VoteChip vote={resp.vote} />
                          <span className="text-xs text-gray-500">
                            {session.options.find(o => o.id === resp.vote)?.label ?? resp.vote}
                          </span>
                          {resp.voteChanged && (
                            <span className="rounded-full bg-[#FFB186]/20 px-1.5 py-0.5 text-[10px] font-medium text-[#6B3A1A]">
                              changed
                              {resp.attributedTo && (
                                <> · {resp.attributedTo.split("/").pop()}</>
                              )}
                            </span>
                          )}
                        </div>
                        <div className="prose prose-sm max-w-none text-gray-700 prose-headings:text-[#1B2E40] prose-headings:text-sm prose-headings:font-semibold prose-strong:text-[#1B2E40] prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-p:my-1">
                          <Markdown>{resp.reasoning}</Markdown>
                        </div>
                      </div>
                    ))}

                    {/* Round summary */}
                    {roundSummary && (
                      <div className="rounded-lg border border-[#8CECF2]/30 bg-[#8CECF2]/5 p-3">
                        <h4 className="mb-1.5 text-xs font-semibold text-[#0D4F54]">Round Summary</h4>
                        <ul className="mb-2 space-y-1 text-sm text-gray-700">
                          {roundSummary.keyArguments.map((arg, i) => (
                            <li key={i}>• {arg}</li>
                          ))}
                        </ul>
                        {roundSummary.voteChanges.length > 0 && (
                          <div className="mb-2 space-y-0.5">
                            {roundSummary.voteChanges.map((change, i) => (
                              <p key={i} className="text-xs text-[#6B3A1A]">↻ {change}</p>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-500 italic">
                          {roundSummary.outlook}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {rounds.length === 0 && (
        <p className="text-center text-sm text-gray-400">
          Waiting for first round...
        </p>
      )}
    </div>
  );
}
