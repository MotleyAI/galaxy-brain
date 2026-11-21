import { describe, expect, it } from "vitest";
import type { Segment } from "../state";
import { depthStarts, firstChangeAnchor } from "./digest";
import type { Piece } from "./stretch";

describe("question headings", () => {
  const piece = (id: string, lvl: number, shown: number): Piece => ({
    segment: { id, level: lvl, text: "a b", panel: null } as Segment,
    words: ["a", "b"],
    shown,
    panel: null,
  });

  it("go before the first visible segment of each deeper depth, in reading order", () => {
    const pieces = [piece("answer", 0, 2), piece("trend", 2, 2), piece("split", 1, 2), piece("mix", 2, 2), piece("next", 3, 0)];
    expect([...depthStarts(pieces)]).toEqual([
      ["trend", 2],
      ["split", 1],
    ]);
  });
});

describe("first change of a depth", () => {
  const seg = (id: string, lvl: number, text = "Text."): Segment => ({ id, level: lvl, text, panel: null });
  const text = [seg("answer", 0), seg("trend", 3), seg("split", 1), seg("blank", 1, ""), seg("mix", 2), seg("more", 3)];

  it("is just after the visible text it is inserted after, even when that is high up", () => {
    expect([firstChangeAnchor(text, 3), firstChangeAnchor(text, 2), firstChangeAnchor(text, 1)]).toEqual([
      "answer",
      "split",
      "answer",
    ]);
  });

  it("is the top of the answer when the depth starts first, and nothing for a depth with no text", () => {
    expect([firstChangeAnchor([seg("lead", 1), seg("answer", 0)], 1), firstChangeAnchor(text, 7)]).toEqual([null, null]);
  });
});
