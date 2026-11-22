import type { SlayerQuery } from "../state";

/** One part of a line of the query card; `rich` marks what SLayer does that plain SQL makes hard. */
export interface Part {
  text: string;
  rich?: "formula" | "join";
}
export interface Line {
  key: string;
  parts: Part[];
}

const RICH = /\b(time_shift|change_pct|cumsum|partition_by|weighted_avg)\b/;

function measure(m: SlayerQuery["measures"][number]): Part {
  if (typeof m === "string") return { text: m, rich: RICH.test(m) ? "formula" : undefined };
  const name = m.label ?? m.name;
  const text = name && name !== m.formula ? `${name} = ${m.formula}` : m.formula;
  return { text, rich: RICH.test(m.formula) ? "formula" : undefined };
}

function range(value: string | string[] | undefined): string {
  if (value === undefined) return "";
  return Array.isArray(value) ? ` · ${value.join(" → ")}` : ` · ${value}`;
}

/**
 * The query as a reader can scan it: the model it starts from, its measures (formulas such as time_shift marked),
 * the dimensions it splits by (paths through joined models marked), its time window, filters, order and limit.
 */
export function describe(query: SlayerQuery): Line[] {
  const lines: Line[] = [{ key: "from", parts: [{ text: query.source_model }] }];
  lines.push({ key: "measures", parts: query.measures.map(measure) });
  const dims = query.dimensions ?? [];
  if (dims.length) lines.push({ key: "by", parts: dims.map((d) => ({ text: d, rich: d.includes(".") ? "join" : undefined })) });
  for (const t of query.time_dimensions ?? []) {
    const by = t.granularity ? ` by ${t.granularity}` : "";
    lines.push({ key: "time", parts: [{ text: `${t.dimension}${by}${range(t.date_range)}` }] });
  }
  const filters = query.filters ?? [];
  if (filters.length) lines.push({ key: "where", parts: filters.map((f) => ({ text: f })) });
  const order = (query.order ?? []).map((o) => `${o.column} ${o.direction ?? "asc"}`).join(", ");
  const limit = query.limit ? `limit ${query.limit}` : "";
  if (order || limit) lines.push({ key: "order", parts: [{ text: [order, limit].filter(Boolean).join(", ") }] });
  return lines;
}
