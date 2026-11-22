import { useState } from "react";
import type { SlayerQuery } from "../state";
import { describe } from "./query";

/** A quiet toggle under a chart: the SLayer query behind it, as data, with what makes it more than SQL marked. */
export function QueryCard({ query }: { query: SlayerQuery }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="query-card" data-open={open || undefined}>
      <button type="button" className="query-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Hide the SLayer query" : "SLayer query"}
      </button>
      {open && (
        <dl className="query-lines">
          {describe(query).map((line) => (
            <div key={line.key}>
              <dt>{line.key}</dt>
              <dd>
                {line.parts.map((part, i) => (
                  <span key={i} className={part.rich ? `q-${part.rich}` : undefined} title={part.rich === "join" ? "Through a join SLayer knows" : part.rich === "formula" ? "A SLayer formula" : undefined}>
                    {part.text}
                  </span>
                ))}
              </dd>
            </div>
          ))}
          <p className="query-foot">No SQL written: SLayer compiles this against the semantic layer.</p>
        </dl>
      )}
    </div>
  );
}
