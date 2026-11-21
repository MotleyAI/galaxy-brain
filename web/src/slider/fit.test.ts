import { describe, expect, it } from "vitest";
import type { ResolvedLevel, Segment } from "../state";
import { heightAt, monotone, positionAt, stops, type Point } from "./fit";

const panel = (id: string) => ({ id, kind: "kpi" as const, title: id.toUpperCase(), parent: null, data: { columns: [], rows: [] } });
const levels: ResolvedLevel[] = [
  { index: 0, title: "Number", rationale: "", panels: [panel("total")] },
  { index: 1, title: "Split", rationale: "", panels: [panel("total"), panel("by_store")] },
];
const segments: Segment[] = [
  { id: "answer", level: 0, text: "Revenue is two million.", panel: "total" },
  { id: "lead", level: 1, text: "Brooklyn leads.", panel: null },
  { id: "stores", level: 1, text: "Four stores sell.", panel: "by_store" },
];

// Level 0 is 100px; "lead" completes at 140px; "stores" completes at 180px and its panel adds 120px.
const points: Point[] = [
  { position: 0, height: 100 },
  { position: 2 / 6, height: 140 },
  { position: 5 / 6, height: 180 },
  { position: 5 / 6, height: 300 },
  { position: 1, height: 300 },
];

describe("height-to-detail map", () => {
  it("measures each whole level and each completed segment, with and without its new panel", () => {
    const layout = stops(segments, levels, 1).map((s) => [
      s.position.toFixed(3),
      s.pieces.filter((p) => p.panel).map((p) => p.panel?.id).join(","),
    ]);
    expect(layout).toEqual([
      ["0.000", "total"],
      ["0.333", "total"],
      ["0.833", "total"],
      ["0.833", "total,by_store"],
      ["1.000", "total,by_store"],
    ]);
  });

  it("maps height to position linearly while text grows", () => {
    expect(positionAt(points, 100)).toBe(0);
    expect(positionAt(points, 120)).toBeCloseTo(1 / 6);
    expect(positionAt(points, 160)).toBeCloseTo(7 / 12);
  });

  it("holds the position while the box uncovers a panel", () => {
    expect(positionAt(points, 200)).toBeCloseTo(5 / 6);
    expect(positionAt(points, 290)).toBeCloseTo(5 / 6);
  });

  it("gives a height that shows a whole level that level's position", () => {
    const shared: Point[] = [points[0]!, { position: 0.9, height: 200 }, { position: 1, height: 200 }, { position: 2, height: 400 }];
    expect(positionAt(shared, 200)).toBe(1);
  });

  it("clamps outside the measured range", () => {
    expect(positionAt(points, 10)).toBe(0);
    expect(positionAt(points, 999)).toBe(1);
    expect(heightAt(points, 5)).toBe(300);
  });

  it("inverts: a position's height maps back to that position, with any panel there shown in full", () => {
    for (const p of [0, 0.1, 1 / 3, 0.5, 0.7, 1]) expect(positionAt(points, heightAt(points, p))).toBeCloseTo(p);
    expect(heightAt(points, 5 / 6)).toBe(300);
  });

  it("is deterministic and non-decreasing: a taller box never shows less", () => {
    const wobbly = monotone([...points.slice(0, 2), { position: 0.5, height: 139 }, ...points.slice(2)]);
    let before = 0;
    for (let h = 90; h <= 320; h += 5) {
      const p = positionAt(wobbly, h);
      expect(p).toBeGreaterThanOrEqual(before);
      expect(positionAt(wobbly, h)).toBe(p);
      before = p;
    }
  });
});
