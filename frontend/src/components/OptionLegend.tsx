import { getVoteBgColor, getVoteColor, getVoteTextColor } from "./VoteChip";
import type { VoteOption } from "../types";

interface OptionLegendProps {
  options: VoteOption[];
}

export function OptionLegend({ options }: OptionLegendProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
      {options.map((opt) => (
        <div key={opt.id} className="flex items-center gap-1.5 text-xs text-gray-600">
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
            style={{ backgroundColor: getVoteBgColor(opt.id), color: getVoteTextColor(opt.id) }}
          >
            {opt.id}
          </span>
          <span className="font-medium" style={{ color: getVoteColor(opt.id) }}>
            {opt.label !== opt.id ? opt.label : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
