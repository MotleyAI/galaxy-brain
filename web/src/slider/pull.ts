/** How far, in pixels, the reader pulls the handle to unlock the next depth (or, pulling up, to fold one). */
export const THRESHOLD = 120;

/** The room the pull opens under the answer: it follows the finger, then resists when nothing more can unlock. */
export function stretch(dy: number, canUnlock: boolean): number {
  if (dy <= 0) return 0;
  const free = canUnlock ? THRESHOLD : THRESHOLD / 3;
  return dy <= free ? dy * 0.7 : free * 0.7 + Math.sqrt(dy - free) * 3;
}

/** How charged the pull is: 1 unlocks the next depth, -1 folds the current one. */
export function charge(dy: number): number {
  return Math.max(-1, Math.min(1, dy / THRESHOLD));
}

/** The depth a pull lands on: one deeper or shallower once it passes the threshold, within what has arrived. */
export function pulledDepth(depth: number, dy: number, reachable: number): number {
  if (dy >= THRESHOLD && depth < reachable) return depth + 1;
  if (dy <= -THRESHOLD && depth > 0) return depth - 1;
  return depth;
}

/** How long a newly unlocked depth takes to write itself in: about 28 ms a word, never too abrupt or too slow. */
export function writingMs(words: number): number {
  return Math.max(450, Math.min(1800, words * 28));
}

/** The brain's stage for a depth: 0 at the plain number, 1 at the deepest analysis. */
export function stage(depth: number, total: number): number {
  return total > 1 ? Math.max(0, Math.min(1, depth / (total - 1))) : 0;
}
