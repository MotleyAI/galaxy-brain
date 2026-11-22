import type { Digest, ResolvedLevel, ResolvedPanel, Segment } from "../state";
import { withFallbacks } from "./stretch";

/**
 * The answer as one stream that only ever grows: depth 1's text and charts, then depth 2's after them, and so on.
 * Nothing already written moves; each depth adds below what is there. The stream is measured in units, one per word,
 * and a few per chart row or table row, so a pull writes text and draws charts at the same steady pace.
 */
export type Item =
  | { kind: "question"; id: string; level: number; words: string[] }
  | { kind: "text"; id: string; level: number; words: string[] }
  | { kind: "panel"; id: string; level: number; panel: ResolvedPanel };

export interface Placed {
  item: Item;
  start: number;
  cost: number;
}

/** What a reader sees of an item: how many words, or how far a chart has drawn (0 to 1). */
export interface Shown {
  item: Item;
  cost: number;
  words: number;
  progress: number;
}

/** Units per chart row or table row, plus a fixed part for the chart's frame. */
export const ROW_UNITS = 3;
export const FRAME_UNITS = 4;

export function panelCost(panel: ResolvedPanel): number {
  const rows = Math.max(1, panel.data.rows.length);
  if (panel.kind === "kpi") return 6;
  if (panel.kind === "line") return FRAME_UNITS + rows * 1.5;
  return FRAME_UNITS + rows * ROW_UNITS;
}

function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/**
 * The stream for the depths that have arrived. Within a depth the narration keeps its order; each depth after the
 * first opens with the question it answers. Each panel comes right after the segment that introduces it, the first
 * time any depth shows it.
 */
export function buildStream(narration: Segment[], levels: ResolvedLevel[], digests: Digest[]): Placed[] {
  const segments = withFallbacks(narration, levels);
  const panels = new Map<string, ResolvedPanel>();
  levels.forEach((level) => level.panels.forEach((p) => panels.has(p.id) || panels.set(p.id, p)));
  const placed: Placed[] = [];
  const seen = new Set<string>();
  let at = 0;
  const push = (item: Item, cost: number) => {
    placed.push({ item, start: at, cost });
    at += cost;
  };
  for (const level of levels) {
    const own = segments.filter((s) => s.level === level.index);
    const question = digests.find((d) => d.level === level.index)?.question;
    if (level.index > 0 && question && own.length) {
      const list = words(question);
      push({ kind: "question", id: `q-${level.index}`, level: level.index, words: list }, list.length);
    }
    for (const segment of own) {
      const list = words(segment.text);
      if (list.length) push({ kind: "text", id: segment.id, level: level.index, words: list }, list.length);
      const panel = segment.panel ? panels.get(segment.panel) : undefined;
      if (panel && !seen.has(panel.id)) {
        seen.add(panel.id);
        push({ kind: "panel", id: panel.id, level: level.index, panel }, panelCost(panel));
      }
    }
  }
  return placed;
}

export function totalUnits(stream: Placed[]): number {
  const last = stream[stream.length - 1];
  return last ? last.start + last.cost : 0;
}

/** Where depth `level` ends in the stream: the whole of depth 1 is there from the start. */
export function depthEnd(stream: Placed[], level: number): number {
  return stream.filter((p) => p.item.level <= level).reduce((end, p) => Math.max(end, p.start + p.cost), 0);
}

/** Everything written up to `units`, in order, with the partly written item last. */
export function written(stream: Placed[], units: number): Shown[] {
  const shown: Shown[] = [];
  for (const { item, start, cost } of stream) {
    if (units <= start) break;
    const progress = Math.min(1, (units - start) / cost);
    const count = item.kind === "panel" ? 0 : Math.min(item.words.length, Math.ceil(progress * item.words.length - 1e-9));
    shown.push({ item, cost, words: count, progress });
  }
  return shown;
}

/** The depth being written at `units` (0-based), and how much of it is written: the brain's stage and its ring. */
export function depthAt(stream: Placed[], units: number): { depth: number; fill: number } {
  const levels = [...new Set(stream.map((p) => p.item.level))];
  let depth = 0;
  for (const level of levels) if (level > 0 && units > depthEnd(stream, level - 1) + 1e-9) depth = level;
  const from = depth > 0 ? depthEnd(stream, depth - 1) : 0;
  const to = depthEnd(stream, depth);
  return { depth, fill: to > from ? Math.max(0, Math.min(1, (units - from) / (to - from))) : 1 };
}

/** Human speed: about eleven words a second at most, close to reading pace, however hard the reader pulls. */
export const MAX_UNITS_PER_S = 11;
/** How far below the press point the finger must go before anything is written, and where full speed is reached. */
export const DEAD_ZONE = 12;
export const FULL_SPEED_AT = 140;

/**
 * The writing speed for a pull: nothing within the dead zone, then faster the further the finger is pulled, up to
 * human speed. Pulling up unwrites at the same pace.
 */
export function speed(dy: number): number {
  const beyond = Math.max(0, Math.abs(dy) - DEAD_ZONE);
  const throttle = Math.min(1, beyond / (FULL_SPEED_AT - DEAD_ZONE));
  return Math.sign(dy) * throttle * MAX_UNITS_PER_S;
}

/** The units after `ms` of pulling at `dy`, within the depth 1 floor and what has arrived. */
export function advance(units: number, dy: number, ms: number, floor: number, total: number): number {
  return Math.max(floor, Math.min(total, units + (speed(dy) * ms) / 1000));
}

/**
 * The room the pull opens under the answer: a slim band, just tall enough for a line of reasoning, that follows the
 * finger a little and resists past full speed.
 */
export function room(dy: number): number {
  if (dy <= 0) return 0;
  return dy <= FULL_SPEED_AT ? dy * 0.28 : FULL_SPEED_AT * 0.28 + Math.sqrt(dy - FULL_SPEED_AT) * 1.5;
}

/** How many of a chart's rows are drawn, as a fraction (2.4 = two rows and 40% of the third), after its frame. */
export function rowsDrawn(progress: number, rows: number, cost: number): number {
  const frame = FRAME_UNITS / cost;
  if (progress <= frame) return 0;
  return Math.min(rows, ((progress - frame) / (1 - frame)) * rows);
}

/** How far a panel item is drawn: its frame first, then its rows. */
export function drawnOf(shown: Shown): { progress: number; frame: number; rows: number } {
  const cost = shown.cost;
  const item = shown.item;
  const rows = item.kind === "panel" ? Math.max(1, item.panel.data.rows.length) : 1;
  const frameShare = FRAME_UNITS / cost;
  return {
    progress: shown.progress,
    frame: Math.min(1, shown.progress / frameShare),
    rows: shown.progress >= 1 ? rows : rowsDrawn(shown.progress, rows, cost),
  };
}
