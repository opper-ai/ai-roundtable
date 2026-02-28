import { getVoteColor } from "./VoteChip";
import type { VoteOption } from "../types";

interface OptionLegendProps {
  options: VoteOption[];
}

export function OptionLegend({ options }: OptionLegendProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
      {options.map((opt) => (
        <div key={opt.id} className="flex items-center gap-1.5 text-xs text-slate-300">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: getVoteColor(opt.id) }}
          />
          <span className="font-semibold" style={{ color: getVoteColor(opt.id) }}>
            {opt.id}
          </span>
          <span className="text-slate-400">
            {opt.label !== opt.id ? opt.label : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
