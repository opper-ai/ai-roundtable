import { useMemo, useState, useCallback, useRef } from "react";
import { SetupForm } from "./components/SetupForm";
import { RoundtableCanvas } from "./components/RoundtableCanvas";
import { TranscriptPanel } from "./components/TranscriptPanel";
import { StatusBar } from "./components/StatusBar";
import { OptionLegend } from "./components/OptionLegend";
import { RoundSlider } from "./components/RoundSlider";
import { useSession } from "./hooks/useSession";
import { createSession } from "./api/client";

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { session, error } = useSession(sessionId);
  const [runAgainLoading, setRunAgainLoading] = useState(false);
  const [viewRound, setViewRound] = useState<number | null>(null); // null = live
  const [questionExpanded, setQuestionExpanded] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  // Determine which models are currently "thinking" (no response yet in the current round)
  const thinkingModels = useMemo(() => {
    if (!session || session.status !== "running") return new Set<string>();
    const currentRound = session.rounds[session.rounds.length - 1];
    if (!currentRound || currentRound.completedAt) return new Set<string>();
    const responded = new Set(currentRound.responses.map((r) => r.modelId));
    return new Set(session.models.filter((m) => !responded.has(m)));
  }, [session]);

  const displayRound = viewRound ?? (session ? session.rounds.length : undefined);

  // Callback for transcript to scroll to a round
  const [scrollToRound, setScrollToRound] = useState<number | null>(null);

  const handleRoundChange = useCallback((round: number | null) => {
    setViewRound(round);
    if (round !== null) {
      setScrollToRound(round);
    }
  }, []);

  const handleGoHome = useCallback(() => {
    setViewRound(null);
    setSessionId(null);
  }, []);

  const handleRunAgain = async () => {
    if (!session) return;
    setRunAgainLoading(true);
    try {
      const { sessionId: newId } = await createSession({
        question: session.question,
        models: session.models,
        options: session.options,
        mode: session.mode,
        consensusThreshold: session.consensusThreshold,
        maxRounds: session.maxRounds,

      });
      setViewRound(null);
      setSessionId(newId);
    } catch {
      // errors will show via the session error state
    } finally {
      setRunAgainLoading(false);
    }
  };

  if (!sessionId || !session) {
    return <SetupForm onSessionCreated={setSessionId} />;
  }

  const winningLabel =
    session.winningOption != null
      ? session.options.find((option) => option.id === session.winningOption)?.label
      : undefined;
  const isHistoricalView = viewRound != null && viewRound < session.rounds.length;

  return (
    <div className="flex h-screen flex-col bg-[#F8F8F8]">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-3" ref={headerRef}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              className="cursor-pointer text-left text-lg font-bold text-[#1B2E40] transition-colors hover:text-[#0D5445]"
              onClick={handleGoHome}
            >
              AI Roundtable
            </button>
            <div
              className="group mt-0.5 cursor-pointer"
              onClick={() => setQuestionExpanded((v) => !v)}
            >
              <p
                className={`text-sm text-gray-500 ${questionExpanded ? "" : "line-clamp-2"}`}
              >
                {session.question}
              </p>
              <span className="text-[10px] text-gray-400 group-hover:text-gray-600 transition-colors">
                {questionExpanded ? "Show less" : "Show more"}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-[10px] text-gray-400">
            <span>Powered by</span>
            <img src="/opper-logo.png" alt="Opper" className="h-3.5 w-3.5" />
            <span className="font-medium text-[#1B2E40]">Opper</span>
          </div>
          <div className="flex shrink-0 gap-2">
            {(session.status === "consensus" || session.status === "max_rounds") && (
              <button
                className="rounded-lg bg-gradient-to-r from-[#8CECF2] to-[#FFB186] px-3 py-1.5 text-xs font-semibold text-[#1B2E40] hover:opacity-90 disabled:opacity-50 transition-opacity"
                onClick={handleRunAgain}
                disabled={runAgainLoading}
              >
                {runAgainLoading ? "Starting..." : "Run Again"}
              </button>
            )}
            <button
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              onClick={handleGoHome}
            >
              New Roundtable
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Canvas */}
        <div className="flex flex-1 items-center justify-center overflow-auto p-6">
          <div className="flex w-full max-w-[620px] flex-col items-start gap-4">
            <div className="w-full">
              {isHistoricalView && (
                <div>
                  <span className="text-sm font-semibold text-gray-500">
                    Round {displayRound}
                  </span>
                </div>
              )}
              {!isHistoricalView && session.status === "running" && (
                <div>
                  <span className="text-sm font-semibold text-[#3C3CAF]">
                    Round {session.rounds.length || 1}
                  </span>
                </div>
              )}
              {!isHistoricalView && session.status === "consensus" && (
                <div className="flex flex-col items-start">
                  <span className="text-base font-semibold text-[#0D5445]">
                    Consensus: {session.winningOption}
                  </span>
                  {winningLabel && winningLabel !== session.winningOption && (
                    <span className="text-sm text-[#0D5445]/70">{winningLabel}</span>
                  )}
                </div>
              )}
              {!isHistoricalView && session.status === "max_rounds" && (
                <div>
                  <span className="text-base font-semibold text-[#6B3A1A]">
                    No consensus
                  </span>
                </div>
              )}
            </div>
            <div className="flex w-full justify-center">
              <RoundtableCanvas
                session={session}
                thinkingModels={thinkingModels}
                displayRound={displayRound}
              />
            </div>
            <RoundSlider
              totalRounds={session.rounds.length}
              maxRounds={session.maxRounds}
              selectedRound={viewRound}
              onRoundChange={handleRoundChange}
              isRunning={session.status === "running"}
            />
            <OptionLegend options={session.options} />
            <StatusBar session={session} displayRound={displayRound} />
          </div>
        </div>

        {/* Right: Transcript */}
        <div className="w-[480px] border-l border-gray-200 bg-white p-4 overflow-y-auto">
          <h2 className="mb-3 text-sm font-semibold text-[#1B2E40]">
            Transcript
          </h2>
          <TranscriptPanel
            session={session}
            scrollToRound={scrollToRound}
            onScrollHandled={() => setScrollToRound(null)}
          />
        </div>
      </div>

      {error && (
        <div className="border-t border-red-200 bg-red-50 px-6 py-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}

export default App;
