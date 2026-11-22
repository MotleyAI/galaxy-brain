import { describe, expect, it } from "vitest";
import type { Digest, ResolvedLevel, ResolvedPanel, Segment } from "../state";
import {
  buildStream,
  depthAt,
  depthEnd,
  drawnOf,
  FRAME_UNITS,
  MAX_UNITS_PER_S,
  nextStop,
  prevStop,
  room,
  ROW_UNITS,
  STEP_PULL,
  toward,
  totalUnits,
  UNWRITE_FACTOR,
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
  const stream = buildStream(narration, levels, digests);
  const end = totalUnits(stream);

  it("moves a depth at a time: the next depth's end, or back to the one before", () => {
    expect(nextStop(stream, 9)).toBe(end);
    expect(nextStop(stream, end)).toBe(end);
    expect(prevStop(stream, end)).toBe(9);
    expect(prevStop(stream, 15)).toBe(9);
    expect(prevStop(stream, 9)).toBe(9);
  });

  it("writes a depth at human speed, never past it, and unwrites faster", () => {
    expect(toward(10, 100, 1000)).toBe(10 + MAX_UNITS_PER_S);
    expect(toward(99, 100, 1000)).toBe(100);
    expect(toward(100, 9, 1000)).toBe(100 - MAX_UNITS_PER_S * UNWRITE_FACTOR);
    expect(toward(10, 9, 1000)).toBe(9);
  });

  it("opens a slim room that follows the finger to a step, then resists", () => {
    expect(room(-10)).toBe(0);
    expect(room(STEP_PULL)).toBeCloseTo(28);
    expect(room(200)).toBeLessThan(50);
    expect(room(500) - room(400)).toBeLessThan(10);
  });
});
