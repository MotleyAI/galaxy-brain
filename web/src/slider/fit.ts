import type { ResolvedLevel, Segment } from "../state";
import { reveal, type Piece } from "./stretch";

/** A layout to measure: what the reader sees at `position`, with or without the panel that completes there. */
export interface Stop {
  position: number;
  pieces: Piece[];
}

/** A measured stop: the answer's height in pixels at a position. */
export interface Point {
  position: number;
  height: number;
}

function words(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * The layouts whose heights define the height-to-detail map: every whole level, and inside each step the moment
 * each added segment completes, once without its panel and once with it. Between two stops the text grows word by
 * word, so the height in between is close to linear.
 */
export function stops(segments: Segment[], levels: ResolvedLevel[], reachable: number): Stop[] {
  const result: Stop[] = [{ position: 0, pieces: reveal(segments, levels, 0) }];
  for (let base = 0; base < reachable; base++) {
    const growing = segments.filter((s) => s.level === base + 1);
    const total = growing.reduce((sum, s) => sum + words(s.text), 0) + 1;
    let done = 0;
    for (const segment of growing) {
      done += words(segment.text);
      if (done === 0) continue;
      const position = base + done / total;
      const pieces = reveal(segments, levels, position);
      const before = new Set(reveal(segments, levels, position - 1e-6).flatMap((p) => (p.panel ? [p.panel.id] : [])));
      if (pieces.some((p) => p.panel && !before.has(p.panel.id))) {
        const without = pieces.map((p) => (p.panel && !before.has(p.panel.id) ? { ...p, panel: null } : p));
        result.push({ position, pieces: without });
      }
      result.push({ position, pieces });
    }
    result.push({ position: base + 1, pieces: reveal(segments, levels, base + 1) });
  }
  return result;
}

/** Makes measured heights non-decreasing, so the map has an inverse even if a measurement wobbles by a pixel. */
export function monotone(points: Point[]): Point[] {
  let top = 0;
  return points.map((p) => {
    top = Math.max(top, p.height);
    return { position: p.position, height: top };
  });
}

/**
 * The position for a given answer height. Between stops it is linear; across a panel's jump in height the position
 * holds still while the growing box uncovers the panel.
 */
export function positionAt(points: Point[], height: number): number {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return 0;
  if (height <= first.height) return first.position;
  if (height >= last.height) return last.position;
  // A height several stops share (a panel's full height, then the whole level) belongs to the furthest of them.
  const plateau = points.filter((p) => p.height === height).map((p) => p.position);
  if (plateau.length) return Math.max(...plateau);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    if (height <= b.height) {
      if (b.height === a.height || b.position === a.position) return a.position;
      return a.position + ((height - a.height) / (b.height - a.height)) * (b.position - a.position);
    }
  }
  return last.position;
}

/** The answer height for a position: the inverse of `positionAt`, showing any panel at that position in full. */
export function heightAt(points: Point[], position: number): number {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return 0;
  if (position <= first.position) return Math.max(...points.filter((p) => p.position === first.position).map((p) => p.height));
  if (position >= last.position) return last.height;
  let height = first.height;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    if (position >= b.position) {
      height = b.height;
      continue;
    }
    if (position > a.position) height = a.height + ((position - a.position) / (b.position - a.position)) * (b.height - a.height);
    break;
  }
  return height;
}
