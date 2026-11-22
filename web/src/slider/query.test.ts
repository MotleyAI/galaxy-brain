import { describe as group, expect, it } from "vitest";
import { describe } from "./query";

group("the query card", () => {
  it("reads as from, measures, by, time, where and order, marking formulas and joins", () => {
    const lines = describe({
      source_model: "orders",
      measures: ["total_revenue", { formula: "time_shift(total_revenue, -1, 'year')", name: "last_year", label: "Last year" }],
      dimensions: ["stores.name", "status"],
      time_dimensions: [{ dimension: "ordered_at", granularity: "month", date_range: ["2026-01-01", "2026-10-31"] }],
      filters: ["status = 'completed'"],
      order: [{ column: "revenue", direction: "desc" }],
      limit: 3,
    });
    expect(lines.map((l) => l.key)).toEqual(["from", "measures", "by", "time", "where", "order"]);
    expect(lines[1]!.parts).toEqual([
      { text: "total_revenue", rich: undefined },
      { text: "Last year = time_shift(total_revenue, -1, 'year')", rich: "formula" },
    ]);
    expect(lines[2]!.parts.map((p) => p.rich)).toEqual(["join", undefined]);
    expect(lines[3]!.parts[0]!.text).toBe("ordered_at by month · 2026-01-01 → 2026-10-31");
    expect(lines[5]!.parts[0]!.text).toBe("revenue desc, limit 3");
  });
});
