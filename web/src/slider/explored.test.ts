import { describe, expect, it } from "vitest";
import { exploration, measureName } from "./explored";

describe("what the agent explored", () => {
  it("names measures as a reader would", () => {
    expect(measureName("total_revenue")).toBe("revenue");
    expect(measureName({ formula: "order_count / unique_customers", name: "opc" })).toBe("orders per customer");
    expect(measureName({ formula: "change_pct(total_revenue)", name: "qoq" })).toBe("change in revenue");
    expect(measureName({ formula: "units_sold / order_id:count_distinct", name: "upo" })).toBe("units per order");
    expect(measureName({ formula: "x", label: "Average order" })).toBe("average order");
    expect(measureName({ formula: "units_sold / sum(units_sold, partition_by=[orders.stores.name])", name: "s" })).toBe("share of units");
  });

  it("counts probes and profiles, and collects measures and what they were split by", () => {
    const result = exploration([
      { tool: "profile_dimension", input: { model: "orders", dimension: "stores.name" } },
      {
        tool: "probe_query",
        input: {
          source_model: "items",
          measures: ["units_sold", "total_revenue"],
          dimensions: ["orders.stores.name", "products.type"],
          time_dimensions: [{ dimension: "orders.ordered_at", granularity: "month" }],
        },
      },
    ]);
    expect(result).toEqual({
      queries: 1,
      profiles: 1,
      measures: ["units", "revenue"],
      across: ["store", "product line", "month"],
    });
  });
});
