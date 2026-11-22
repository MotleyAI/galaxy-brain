import "@openuidev/react-ui/styles/openui-defaults.css";
import "@openuidev/react-ui/styles/shared.css";
import "@openuidev/react-ui/styles/card.css";
import "@openuidev/react-ui/styles/table.css";
import "@openuidev/react-ui/styles/metricIndicator.css";
import "@openuidev/react-ui/styles/charts.css";
import "@openuidev/react-ui/styles/tooltipWrapper.css";
import { Card } from "@openuidev/react-ui/parts/Card/Card";
import { ThemeProvider } from "@openuidev/react-ui/parts/ThemeProvider/ThemeProvider";
import { useSystemThemeMode } from "@openuidev/react-ui/parts/ThemeProvider/useSystemThemeMode";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { PanelView } from "../panels";
import { useAnswer, type AnswerStore } from "../state";
import { Brain } from "./Brain";
import { stage } from "./pull";
import { advance, buildStream, DEAD_ZONE, depthAt, depthEnd, drawnOf, FULL_SPEED_AT, room, totalUnits, written, type Shown } from "./stream";

/**
 * The answer as a continuous expansion. Holding the handle pulled down writes more of the answer, word by word, and
 * draws its charts row by row, always below what is already there; the further the pull, the faster, up to human
 * speed. Letting go stops the writing; pulling up unwrites. The page scrolls with the writing, so the handle stays
 * under the finger and the answer seems to unroll out of it.
 */
export function ResizableAnswer({ store }: { store: AnswerStore }) {
  const state = useAnswer(store);
  const mode = useSystemThemeMode();
  const stream = useMemo(() => buildStream(state.narration, state.levels, state.digests), [state.narration, state.levels, state.digests]);
  const floor = depthEnd(stream, 0);
  const total = totalUnits(stream);
  const [units, setUnits] = useState(0);
  const [dy, setDy] = useState(0);
  const unitsRef = useRef(0);
  const limits = useRef({ floor, total });
  limits.current = { floor, total };
  // The pull: where it started, where the finger is, and where the handle sat on screen when it started.
  const drag = useRef<{ originY: number; clientY: number; anchor: number } | null>(null);
  const key = useRef<{ dy: number; anchor: number } | null>(null);
  const frame = useRef(0);
  const last = useRef(0);
  const handle = useRef<HTMLDivElement>(null);

  const set = (next: number) => {
    unitsRef.current = next;
    setUnits(next);
  };

  // A new question starts again at depth 1, written in full.
  useEffect(() => set(0), [state.question]);
  // Depth 1 is always there in full, however it arrives; until the reader writes more, the answer is just depth 1.
  const lastFloor = useRef(0);
  useEffect(() => {
    if (unitsRef.current < floor || unitsRef.current <= lastFloor.current) set(floor);
    lastFloor.current = floor;
  }, [floor]);

  const pullOf = () => (drag.current ? drag.current.clientY - drag.current.originY : (key.current?.dy ?? 0));
  const tick = (now: number) => {
    if (!drag.current && !key.current) return;
    const ms = Math.min(64, now - last.current);
    last.current = now;
    const pulled = pullOf();
    const next = advance(unitsRef.current, pulled, ms, limits.current.floor, limits.current.total);
    if (next !== unitsRef.current) set(next);
    setDy(drag.current ? pulled : 0);
    frame.current = requestAnimationFrame(tick);
  };
  const start = () => {
    cancelAnimationFrame(frame.current);
    last.current = performance.now();
    frame.current = requestAnimationFrame(tick);
  };
  const stop = () => {
    drag.current = null;
    key.current = null;
    cancelAnimationFrame(frame.current);
    setDy(0);
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // Keep the handle where the finger holds it: as the answer grows above it, the page scrolls by as much.
  useLayoutEffect(() => {
    const anchor = drag.current?.anchor ?? key.current?.anchor;
    const el = handle.current;
    if (anchor === undefined || !el) return;
    const off = el.getBoundingClientRect().top - (anchor + room(drag.current ? dy : 0));
    if (Math.abs(off) > 0.5) window.scrollBy(0, off);
  });

  const onKey = (event: KeyboardEvent) => {
    const top = handle.current?.getBoundingClientRect().top ?? 0;
    const hold = (pulled: number) => {
      if (key.current?.dy === pulled) return;
      key.current = { dy: pulled, anchor: top };
      start();
    };
    switch (event.key) {
      case "ArrowDown":
      case "PageDown":
        hold(FULL_SPEED_AT);
        break;
      case "ArrowUp":
      case "PageUp":
        hold(-FULL_SPEED_AT);
        break;
      case "Home":
        set(floor);
        break;
      case "End":
        set(total);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const building = state.status === "loading" || state.status === "streaming";
  const note = state.notes[state.notes.length - 1];
  if (state.levels.length === 0) return building ? <p className="progress">{note ?? "Starting…"}</p> : null;

  const shown = Math.max(floor, Math.min(units, total));
  const depths = Math.max(state.expectedLevels ?? state.levels.length, state.levels.length);
  const { depth, fill } = depthAt(stream, shown);
  const more = shown < total;
  const writing = dy > DEAD_ZONE && more;
  const label = `Depth ${depth + 1} of ${depths}`;
  // While writing, the room shows the reasoning behind the section being built: why the agent added this depth.
  // Before that, the handle stays generic, so what comes next is a surprise.
  const reasoning = state.levels[depth]?.rationale;
  const invite = writing
    ? reasoning || "Writing…"
    : more
      ? "Pull to expand"
      : building
        ? "Thinking deeper…"
        : "That's the full depth";
  const pulledRoom = room(dy);

  return (
    <ThemeProvider mode={mode}>
      <Card variant="card" width="full" className="answer-card stream" data-writing={writing || undefined}>
        <article className="answer">{blocks(written(stream, shown), writing)}</article>
        <div className="pull-room" style={{ height: pulledRoom }} aria-hidden>
          {pulledRoom > 14 && (
            <span className={writing && reasoning ? "reasoning" : undefined} key={writing ? depth : "idle"}>
              {invite}
            </span>
          )}
        </div>
        <div
          ref={handle}
          className="pull-handle"
          role="slider"
          tabIndex={0}
          title={`${label}. ${invite}.`}
          aria-label="Length of the answer: hold the handle pulled down to keep writing"
          aria-valuemin={Math.round(floor)}
          aria-valuemax={Math.round(total)}
          aria-valuenow={Math.round(shown)}
          aria-valuetext={label}
          data-pulling={dy !== 0 || undefined}
          onKeyDown={onKey}
          onKeyUp={() => key.current && stop()}
          onBlur={() => key.current && stop()}
          onPointerDown={(event) => {
            try {
              event.currentTarget.setPointerCapture(event.pointerId);
            } catch {
              // A synthetic pointer: the pull still works while it stays on the handle.
            }
            drag.current = { originY: event.clientY, clientY: event.clientY, anchor: event.currentTarget.getBoundingClientRect().top };
            start();
          }}
          onPointerMove={(event) => {
            if (drag.current) drag.current.clientY = event.clientY;
          }}
          onPointerUp={stop}
          onPointerCancel={stop}
        >
          <Brain stage={stage(depth, depths)} charge={fill >= 1 && more ? 0 : fill} depth={depth} />
          {shown <= floor && more && dy === 0 && <span className="hint">Pull to expand</span>}
        </div>
        {building && !more && dy === 0 && (
          <p className="progress" aria-live="polite">
            Thinking deeper…
          </p>
        )}
      </Card>
    </ThemeProvider>
  );
}

/** The stream as written so far: each depth's question, its paragraph, and its panels as far as they have drawn. */
function blocks(items: Shown[], writing: boolean): ReactNode[] {
  const result: ReactNode[] = [];
  let paragraph: Shown[] = [];
  const end = items[items.length - 1];
  const flush = () => {
    const first = paragraph[0];
    if (first) result.push(<Paragraph key={`p-${first.item.id}`} items={paragraph} caret={writing ? end : undefined} />);
    paragraph = [];
  };
  for (const shown of items) {
    const item = shown.item;
    if (item.kind === "text") {
      if (paragraph.length && paragraph[0]!.item.level !== item.level) flush();
      paragraph.push(shown);
      continue;
    }
    flush();
    if (item.kind === "question") {
      result.push(
        <h4 className="depth-question" key={item.id}>
          {item.words.slice(0, shown.words).join(" ")}
          {writing && shown === end && <span className="caret" />}
        </h4>,
      );
    } else {
      result.push(
        <div className="inline-panel" key={item.id}>
          <PanelView panel={item.panel} drawn={shown.progress >= 1 ? undefined : drawnOf(shown)} />
        </div>,
      );
    }
  }
  flush();
  return result;
}

function Paragraph({ items, caret }: { items: Shown[]; caret?: Shown }) {
  return (
    <p className={`stretch level-${items[0]!.item.level}`}>
      {items.map((shown) => {
        const item = shown.item;
        if (item.kind !== "text") return null;
        return (
          <span className="segment" key={item.id} data-seg={item.id}>
            {item.words.slice(0, shown.words).map((word, i) => (
              <span className="word" key={i}>
                {word}{" "}
              </span>
            ))}
            {shown === caret && <span className="caret" />}
          </span>
        );
      })}
    </p>
  );
}
