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
      <span className="text-[10px] text-gray-400 uppercase tracking-wider">
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
                    ? "bg-[#1B2E40] text-white"
                    : "bg-white text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                } ${round === 1 ? "rounded-l-lg" : ""} ${
                  round === totalRounds ? "rounded-r-lg" : ""
                } border-r border-gray-200 last:border-r-0`}
                onClick={() => onRoundChange(round === totalRounds && isLive ? null : round)}
              >
                {round}
              </button>
            );
          })}
        </div>
        <button
          className={`flex h-7 items-center gap-1 rounded-lg px-2.5 text-xs font-medium transition-colors ${
            isLive
              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
              : "bg-white text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          }`}
          onClick={() => onRoundChange(null)}
        >
          {isRunning && isLive && (
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          )}
          Live
        </button>
      </div>
    </div>
  );
}
