import type { Probe } from "../state";

const WORDS: Record<string, string> = {
  total_revenue: "revenue",
  net_sales: "net sales",
  order_count: "orders",
  unique_customers: "customers",
  customer_count: "customers",
  avg_order_value: "average order",
  units_sold: "units",
  tax_collected: "tax",
};
const DIMENSIONS: Record<string, string> = {
  "stores.name": "store",
  "products.type": "product line",
  "products.name": "product",
  "regions.name": "region",
  status: "status",
};

const singular = (word: string) => word.replace(/s$/, "");
const word = (token: string) => WORDS[token.trim()] ?? token.trim().replace(/_/g, " ");

/** A measure as a reader would name it: `order_count / unique_customers` reads "orders per customer". */
export function measureName(measure: unknown): string {
  if (typeof measure === "string") {
    const [column, agg] = measure.split(":");
    if (agg) return column === "*" ? "rows" : `${word(column!)} (${agg.replace(/_/g, " ")})`;
    return word(measure);
  }
  const m = measure as { formula?: string; label?: string };
  if (m.label) return m.label.toLowerCase();
  const formula = (m.formula ?? "").trim();
  const inner = (f: string) => /\(([^,)]+)/.exec(f)?.[1] ?? f;
  if (/partition_by/.test(formula)) {
    const known = Object.keys(WORDS).find((k) => formula.includes(k));
    return `share of ${known ? WORDS[known] : "the total"}`;
  }
  if (/^change_pct\(/.test(formula)) return `change in ${word(inner(formula))}`;
  if (/time_shift\(/.test(formula)) return `${word(inner(formula.slice(formula.indexOf("time_shift"))))} a period earlier`;
  if (/^cumsum\(/.test(formula)) return `running ${word(inner(formula))}`;
  const parts = formula.split(" / ");
  if (parts.length === 2 && /^\w+$/.test(parts[0]!.trim()) && /^[\w:]+$/.test(parts[1]!.trim())) {
    const below = parts[1]!.includes(":") ? word(parts[1]!.split(":")[0]!.replace(/_id$/, "s")) : word(parts[1]!);
    return `${word(parts[0]!)} per ${singular(below)}`;
  }
  return word(formula);
}

function dimensionName(dimension: string): string {
  const path = dimension.split(".");
  if (/_at$/.test(path[path.length - 1]!)) return "date";
  const key = path.slice(-2).join(".");
  return DIMENSIONS[key] ?? DIMENSIONS[dimension] ?? path[path.length - 1]!.replace(/_/g, " ");
}

export interface Exploration {
  queries: number;
  profiles: number;
  measures: string[];
  across: string[];
}

/** What the agent explored, as a reader can scan it: how many probes and profiles, which measures, across what. */
export function exploration(probes: Probe[]): Exploration {
  const measures = new Set<string>();
  const across = new Set<string>();
  let queries = 0;
  let profiles = 0;
  for (const { tool, input } of probes) {
    const q = (input ?? {}) as {
      measures?: unknown[];
      dimensions?: string[];
      dimension?: string;
      time_dimensions?: { granularity?: string }[];
    };
    if (tool === "profile_dimension") {
      profiles += 1;
      if (q.dimension) across.add(dimensionName(q.dimension));
      continue;
    }
    queries += 1;
    (q.measures ?? []).forEach((m) => measures.add(measureName(m)));
    (q.dimensions ?? []).forEach((d) => across.add(dimensionName(d)));
    (q.time_dimensions ?? []).forEach((t) => t.granularity && across.add(t.granularity));
  }
  return { queries, profiles, measures: [...measures], across: [...across] };
}
