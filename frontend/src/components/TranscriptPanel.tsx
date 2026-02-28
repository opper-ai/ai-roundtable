import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Markdown from "react-markdown";
import { VoteChip, getVoteColor } from "./VoteChip";
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
          className="self-end rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
          onClick={() => downloadTranscript(session)}
        >
          Download Transcript
        </button>
      )}

      {/* Final summary loading */}
      {!session.finalSummary &&
        (session.status === "consensus" || session.status === "max_rounds") && (
        <div className="flex items-center gap-2.5 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
          <svg
            className="h-4 w-4 animate-spin text-slate-400"
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
          <span className="text-xs text-slate-400">Generating final summary...</span>
        </div>
      )}

      {/* Final summary */}
      {session.finalSummary && (
        <div className="rounded-lg border border-green-800/30 bg-green-900/20 p-4">
          <h3 className="mb-2 text-sm font-semibold text-green-400">Final Summary</h3>
          <p className="mb-3 text-sm leading-relaxed text-slate-300">
            {session.finalSummary.narrative}
          </p>
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-slate-400">Strongest arguments per option:</h4>
            {Object.entries(session.finalSummary.strongestPerOption).map(([optId, arg]) => (
              <div key={optId} className="flex gap-2 text-xs">
                <span className="font-bold" style={{ color: getVoteColor(optId) }}>
                  {optId}
                </span>
                <span className="text-slate-300">{arg}</span>
              </div>
            ))}
          </div>
          {session.finalSummary.keyTurningPoints.length > 0 && (
            <div className="mt-3 space-y-1">
              <h4 className="text-xs font-semibold text-slate-400">Key turning points:</h4>
              {session.finalSummary.keyTurningPoints.map((point, i) => (
                <p key={i} className="text-xs text-slate-400">— {point}</p>
              ))}
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
            className="rounded-lg bg-slate-800/50"
          >
            {/* Clickable header */}
            <button
              className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-slate-700/30 transition-colors rounded-lg"
              onClick={() => toggleRound(round.roundNumber)}
            >
              <span
                className="text-[10px] text-slate-500 transition-transform"
                style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
              >
                ▶
              </span>
              <span className="text-sm font-semibold text-slate-300">
                Round {round.roundNumber}
              </span>
              {tallyStr && (
                <span className="text-xs font-normal text-slate-500">
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
                        className="rounded-md bg-slate-900/50 p-3"
                      >
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-400">
                            {resp.modelLabel}
                          </span>
                          <VoteChip vote={resp.vote} />
                          <span className="text-xs text-slate-400">
                            {session.options.find(o => o.id === resp.vote)?.label ?? resp.vote}
                          </span>
                          {resp.voteChanged && (
                            <span className="text-xs text-yellow-400">
                              changed
                              {resp.attributedTo && (
                                <> (convinced by {resp.attributedTo.split("/").pop()})</>
                              )}
                            </span>
                          )}
                        </div>
                        <div className="prose prose-sm prose-invert max-w-none text-slate-300 prose-headings:text-slate-200 prose-headings:text-sm prose-headings:font-semibold prose-strong:text-slate-200 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-p:my-1">
                          <Markdown>{resp.reasoning}</Markdown>
                        </div>
                      </div>
                    ))}

                    {/* Round summary */}
                    {roundSummary && (
                      <div className="rounded-md border border-blue-800/30 bg-blue-900/20 p-3">
                        <h4 className="mb-1.5 text-xs font-semibold text-blue-400">Round Summary</h4>
                        <ul className="mb-2 space-y-1 text-sm text-slate-300">
                          {roundSummary.keyArguments.map((arg, i) => (
                            <li key={i}>• {arg}</li>
                          ))}
                        </ul>
                        {roundSummary.voteChanges.length > 0 && (
                          <div className="mb-2 space-y-0.5">
                            {roundSummary.voteChanges.map((change, i) => (
                              <p key={i} className="text-xs text-yellow-400/80">↻ {change}</p>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-slate-400 italic">
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
        <p className="text-center text-sm text-slate-500">
          Waiting for first round...
        </p>
      )}
    </div>
  );
}
