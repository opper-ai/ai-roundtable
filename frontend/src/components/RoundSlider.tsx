interface RoundSliderProps {
  totalRounds: number;
  maxRounds: number;
  selectedRound: number | null; // null = live
  onRoundChange: (round: number | null) => void;
  isRunning: boolean;
}

export function RoundSlider({
  totalRounds,
  maxRounds: _maxRounds,
  selectedRound,
  onRoundChange,
  isRunning,
}: RoundSliderProps) {
  if (totalRounds === 0) return null;

  const isLive = selectedRound === null;
  const ticks = Array.from({ length: totalRounds }, (_, i) => i + 1);

  return (
    <div className="flex w-full flex-col gap-1.5">
      <span className="text-[10px] text-slate-500 uppercase tracking-wider">
        Round History — click to replay
      </span>
      <div className="flex w-full items-center gap-2">
        <div className="flex flex-1 items-center gap-0">
          {ticks.map((round) => {
            const isSelected = isLive
              ? round === totalRounds
              : round === selectedRound;
            return (
              <button
                key={round}
                className={`flex h-7 flex-1 items-center justify-center text-xs font-medium transition-colors ${
                  isSelected
                    ? "bg-slate-400 text-slate-900"
                    : "bg-slate-800 text-slate-500 hover:bg-slate-600 hover:text-slate-200"
                } ${round === 1 ? "rounded-l-md" : ""} ${
                  round === totalRounds ? "rounded-r-md" : ""
                } border-r border-slate-700 last:border-r-0`}
                onClick={() => onRoundChange(round === totalRounds && isLive ? null : round)}
              >
                {round}
              </button>
            );
          })}
        </div>
        <button
          className={`flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors ${
            isLive
              ? "bg-green-600/20 text-green-400 border border-green-600/40"
              : "bg-slate-800 text-slate-500 hover:bg-slate-600 hover:text-slate-200"
          }`}
          onClick={() => onRoundChange(null)}
        >
          {isRunning && isLive && (
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          )}
          Live
        </button>
      </div>
    </div>
  );
}
