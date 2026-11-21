import type { Digest, ResolvedLevel } from "../state";
import type { Piece } from "./stretch";

export type DepthState = "done" | "current" | "next" | "locked";

/** One line of the outline: a depth, what it found (or what it is, while locked), and whether it can be reached. */
export interface OutlineEntry {
  index: number;
  label: string;
  state: DepthState;
  reachable: boolean;
}

/** The analysis at a glance: every depth, with its headline once unlocked and its title while still to come. */
export function outlineOf(
  total: number,
  levels: ResolvedLevel[],
  digests: Digest[],
  shown: number,
  reachable: number,
): OutlineEntry[] {
  return Array.from({ length: total }, (_, index) => {
    const digest = digests.find((d) => d.level === index);
    const title = levels[index]?.title ?? "Thinking…";
    const state: DepthState = index < shown ? "done" : index === shown ? "current" : index === shown + 1 ? "next" : "locked";
    const label = index <= shown ? (digest?.headline ?? title) : title;
    return { index, label, state, reachable: index <= reachable };
  });
}

/** The summary to show at a depth: that depth's, or the latest one before it while its own is still being written. */
export function summaryAt(digests: Digest[], depth: number): Digest | null {
  return [...digests].filter((d) => d.level <= depth).sort((a, b) => b.level - a.level)[0] ?? null;
}

/** The first visible segment of each deeper level, in reading order: where that depth's question heading goes. */
export function depthStarts(pieces: Piece[]): Map<string, number> {
  const starts = new Map<string, number>();
  const seen = new Set<number>();
  for (const piece of pieces) {
    const level = piece.segment.level;
    if (level === 0 || piece.shown === 0 || seen.has(level)) continue;
    seen.add(level);
    starts.set(piece.segment.id, level);
  }
  return starts;
}
