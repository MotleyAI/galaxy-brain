import { HorizontalBarChart } from "@openuidev/react-ui/parts/Charts/BarChart/HorizontalBarChart";
import { LineChartCondensed } from "@openuidev/react-ui/parts/Charts/LineChart/LineChartCondensed";
import { MetricIndicatorInline } from "@openuidev/react-ui/parts/MetricIndicator";
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@openuidev/react-ui/parts/Table/Table";
import { memo } from "react";
import type { Column, PanelData, ResolvedPanel } from "../state";
import { chartValue, formatCell, labelOf, measures, seriesName, visibleColumns } from "./format";

/** How far a panel has drawn, 0 to 1, and how many of its rows (2.4 = two rows and 40% of the third). */
export interface Drawn {
  progress: number;
  /** How far the chart's frame has opened, 0 to 1, before its rows draw. */
  frame: number;
  rows: number;
}
const FULL: Drawn = { progress: 1, frame: 1, rows: Infinity };
const BAR_ROW = 60;
const BAR_TOP = 18;

const CHART_HEIGHT = 220;

/** Chart rows: the dimension label as the category, the measure as SLayer returned it, named with its unit. */
function chartRows(data: PanelData, label: (row: PanelData["rows"][number]) => string, measure: Column) {
  const name = seriesName(measure);
  return data.rows.map((row) => ({ category: label(row), [name]: chartValue(row[measure.key] ?? null, measure) }));
}

/** A single number rises into place and comes into focus. */
function Kpi({ data, drawn }: { data: PanelData; drawn: Drawn }) {
  const [measure] = measures(data);
  const row = data.rows[0];
  if (!measure || !row) return <p className="empty">No data</p>;
  const p = drawn.progress;
  return (
    <div style={p < 1 ? { opacity: p, transform: `translateY(${(1 - p) * 10}px)`, filter: `blur(${(1 - p) * 3}px)` } : undefined}>
      <MetricIndicatorInline value={formatCell(row[measure.key] ?? null, measure)} subtext={measure.label} />
    </div>
  );
}

/** Bars arrive one under another: the chart unrolls downward a row at a time, as if each were being added. */
function Bars({ data, drawn }: { data: PanelData; drawn: Drawn }) {
  const [measure] = measures(data);
  if (!measure) return null;
  const dims = visibleColumns(data).filter((c) => c.role === "dimension");
  const rows = chartRows(data, (row) => labelOf(row, dims), measure);
  const height = rows.length * BAR_ROW + 80;
  const done = drawn.rows >= rows.length;
  return (
    <figure className="chart">
      <div className="unroll" style={done ? undefined : { height: BAR_TOP + drawn.rows * BAR_ROW }}>
        <HorizontalBarChart data={rows} categoryKey="category" height={height} />
      </div>
      <figcaption>
        {data.rows.slice(0, Math.ceil(drawn.rows)).map((row, i) => (
          <span key={i}>
            {labelOf(row, dims)} <strong>{formatCell(row[measure.key] ?? null, measure, { compact: true })}</strong>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/** A table fills in a row at a time under its header, the newest row fading in. */
function Table({ data, drawn, signed = false }: { data: PanelData; drawn: Drawn; signed?: boolean }) {
  const columns = visibleColumns(data);
  const count = Math.ceil(drawn.rows - 1e-9);
  const last = drawn.rows - Math.floor(drawn.rows);
  return (
    <UiTable>
      <TableHeader>
        <TableRow>
          {columns.map((c) => (
            <TableHead key={c.key} align={c.role === "measure" ? "right" : "left"}>
              {c.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.rows.slice(0, count).map((row, i) => (
          <TableRow key={i} style={i === count - 1 && last > 0 ? { opacity: last } : undefined}>
            {columns.map((c) => {
              const value = row[c.key] ?? null;
              const tone = signed && c.format === "percent" && typeof value === "number" ? (value < 0 ? "down" : "up") : "";
              return (
                <TableCell key={c.key} align={c.role === "measure" ? "right" : "left"} className={tone}>
                  {formatCell(value, c, { signed })}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </UiTable>
  );
}

/** A trend opens its frame, then draws through time from left to right. */
function Line({ data, drawn }: { data: PanelData; drawn: Drawn }) {
  const [measure, ...others] = measures(data);
  const [x] = data.columns.filter((c) => c.role === "dimension");
  if (!measure || !x) return null;
  const rows = chartRows(data, (row) => formatCell(row[x.key] ?? null, x), measure);
  const last = data.rows[data.rows.length - 1];
  const done = drawn.progress >= 1;
  const through = Math.min(1, drawn.rows / rows.length);
  return (
    <figure className="chart">
      <div
        className="unroll"
        style={done ? undefined : { height: CHART_HEIGHT * drawn.frame, clipPath: `inset(0 ${(1 - through) * 100}% 0 0)` }}
      >
        <LineChartCondensed data={rows} categoryKey="category" height={CHART_HEIGHT} showDots />
      </div>
      {done && last && others.length > 0 && (
        <figcaption>
          {others.map((c) => (
            <span key={c.key}>
              {c.label}: <strong>{formatCell(last[c.key] ?? null, c)}</strong>
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * One panel, drawn with OpenUI components, as far as the pull has drawn it. Memoized: the answer re-renders on every
 * frame of a pull, and only the panel being drawn changes.
 */
export const PanelView = memo(function PanelView({ panel, drawn = FULL }: { panel: ResolvedPanel; drawn?: Drawn }) {
  const body = {
    kpi: <Kpi data={panel.data} drawn={drawn} />,
    bar: <Bars data={panel.data} drawn={drawn} />,
    table: <Table data={panel.data} drawn={drawn} />,
    line: <Line data={panel.data} drawn={drawn} />,
    delta: <Table data={panel.data} drawn={drawn} signed />,
  }[panel.kind];
  return (
    <section className={`panel panel-${panel.kind}`} style={drawn.progress < 1 ? { opacity: Math.min(1, drawn.progress * 6) } : undefined}>
      <h3>{panel.title}</h3>
      {body}
    </section>
  );
});
