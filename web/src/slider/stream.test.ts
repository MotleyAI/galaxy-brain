import { describe, expect, it } from "vitest";
import type { Digest, ResolvedLevel, ResolvedPanel, Segment } from "../state";
import {
  advance,
  buildStream,
  depthAt,
  depthEnd,
  drawnOf,
  FRAME_UNITS,
  MAX_UNITS_PER_S,
  room,
  ROW_UNITS,
  speed,
  totalUnits,
  written,
} from "./stream";

const panel = (id: string, kind: ResolvedPanel["kind"], rows: number): ResolvedPanel => ({
  id,
  kind,
  title: id,
  parent: null,
  data: {
    columns: [{ key: "v", label: "V", role: "measure", format: "number" }],
    rows: Array.from({ length: rows }, (_, i) => ({ v: i })),
  },
});
const total = panel("total", "kpi", 1);
const byStore = panel("by_store", "bar", 3);
const levels: ResolvedLevel[] = [
  { index: 0, title: "Number", rationale: "", panels: [total] },
  { index: 1, title: "Split", rationale: "", panels: [total, byStore] },
];
// The narration inserts depth 2's sentence before depth 1's in reading order; the stream appends it instead.
const narration: Segment[] = [
  { id: "s1", level: 1, text: "Brooklyn leads.", panel: "by_store" },
  { id: "s0", level: 0, text: "Revenue is $2M.", panel: "total" },
];
const digests: Digest[] = [{ level: 1, question: "Which store leads?", headline: "", summary: "" }];

describe("the stream", () => {
  const stream = buildStream(narration, levels, digests);

  it("only ever adds below: each depth after the last, opening with its question", () => {
    expect(stream.map((p) => p.item.id)).toEqual(["s0", "total", "q-1", "s1", "by_store"]);
  });

  it("costs a word a unit, and a chart its frame plus its rows", () => {
    expect(stream.map((p) => p.cost)).toEqual([3, 6, 3, 2, FRAME_UNITS + 3 * ROW_UNITS]);
    expect(depthEnd(stream, 0)).toBe(9);
    expect(totalUnits(stream)).toBe(9 + 3 + 2 + 13);
  });

  it("writes words in order and draws the chart row by row", () => {
    const at = written(stream, 9 + 3 + 1);
    expect(at.map((s) => [s.item.id, s.words])).toEqual([
      ["s0", 3],
      ["total", 0],
      ["q-1", 3],
      ["s1", 1],
    ]);
    const chart = written(stream, 14 + FRAME_UNITS + 1.5 * ROW_UNITS).at(-1)!;
    expect(drawnOf(chart)).toMatchObject({ frame: 1, rows: 1.5 });
  });

  it("follows the depth being written, and how far it is", () => {
    expect(depthAt(stream, 9)).toEqual({ depth: 0, fill: 1 });
    expect(depthAt(stream, 18).depth).toBe(1);
    expect(depthAt(stream, totalUnits(stream))).toEqual({ depth: 1, fill: 1 });
  });
});

describe("the pull", () => {
  it("writes nothing in the dead zone, then faster the further it goes, never faster than human speed", () => {
    expect(speed(5)).toBe(0);
    expect(speed(76)).toBeCloseTo(MAX_UNITS_PER_S / 2);
    expect(speed(1000)).toBe(MAX_UNITS_PER_S);
    expect(speed(-1000)).toBe(-MAX_UNITS_PER_S);
  });

  it("advances with time, within depth 1 and what has arrived", () => {
    expect(advance(10, 1000, 1000, 9, 100)).toBe(10 + MAX_UNITS_PER_S);
    expect(advance(10, -1000, 1000, 9, 100)).toBe(9);
    expect(advance(99, 1000, 1000, 9, 100)).toBe(100);
  });

  it("opens room that follows the finger, then resists past full speed", () => {
    expect(room(-10)).toBe(0);
    expect(room(100)).toBeCloseTo(70);
    expect(room(500) - room(400)).toBeLessThan(10);
  });
});
