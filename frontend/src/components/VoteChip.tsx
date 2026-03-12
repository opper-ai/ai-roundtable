import { motion } from "framer-motion";

/**
 * Option colors derived from the Opper brand palette.
 * Cotton Candy gradient (#8CECF2 → #FFB186) as the foundation,
 * with brand accents (Water Leaf, Savoy Purple, Translucent Silk).
 */
const VOTE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: "#8CECF2", text: "#0D4F54", border: "#6DD8E0" },     // Cotton Candy cyan
  B: { bg: "#FFB186", text: "#6B3A1A", border: "#F09B68" },     // Cotton Candy peach
  C: { bg: "#8CF0DC", text: "#0D5445", border: "#6BD8C4" },     // Water Leaf teal
  D: { bg: "#C4B8F0", text: "#2A2370", border: "#A899E0" },     // Savoy Purple light
  E: { bg: "#FFD7D7", text: "#6B2A2A", border: "#F0B8B8" },     // Translucent Silk
  ERROR: { bg: "#E5E7EB", text: "#6B7280", border: "#D1D5DB" },
};

const DEFAULT_COLOR = { bg: "#E0D4F5", text: "#3C3CAF", border: "#C4B8E8" };

export function getVoteColorSet(vote: string) {
  return VOTE_COLORS[vote] ?? DEFAULT_COLOR;
}

/** Returns the main accent color for a vote (used for borders, text highlights) */
export function getVoteColor(vote: string): string {
  return (VOTE_COLORS[vote] ?? DEFAULT_COLOR).border;
}

/** Returns a softer background color for a vote */
export function getVoteBgColor(vote: string): string {
  return (VOTE_COLORS[vote] ?? DEFAULT_COLOR).bg;
}

/** Returns the text color that contrasts with the vote bg */
export function getVoteTextColor(vote: string): string {
  return (VOTE_COLORS[vote] ?? DEFAULT_COLOR).text;
}

export function VoteChip({ vote }: { vote: string }) {
  const colors = getVoteColorSet(vote);
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {vote}
    </motion.span>
  );
}
