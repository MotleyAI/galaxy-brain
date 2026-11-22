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
import {
  BAND,
  buildStream,
  depthAt,
  depthEnd,
  drawnOf,
  nextStop,
  prevStop,
  room,
  STEP_PULL,
  totalUnits,
  toward,
  written,
  type Shown,
} from "./stream";

/**
 * The answer, a depth at a time, written live. A short pull on the handle (or a tap, or the Down arrow) asks for the
 * next depth; it then writes itself below what is there at reading pace, charts drawing row by row, while a slim band
 * shows the agent's reasoning for it. The page follows the writing point until the reader scrolls themselves. Pulling
 * again while a depth writes skips to its end; pulling up goes back a depth.
 */
export function ResizableAnswer({ store }: { store: AnswerStore }) {
  const state = useAnswer(store);
  const mode = useSystemThemeMode();
  const stream = useMemo(() => buildStream(state.narration, state.levels, state.digests), [state.narration, state.levels, state.digests]);
  const floor = depthEnd(stream, 0);
  const total = totalUnits(stream);
  const [units, setUnits] = useState(0);
  const [target, setTarget] = useState(0);
  const [dy, setDy] = useState(0);
  const unitsRef = useRef(0);
  const targetRef = useRef(0);
  const streamRef = useRef(stream);
  streamRef.current = stream;
  // A deeper depth was asked for before it arrived: write it as soon as it does.
  const wanted = useRef(false);
  // While following, where the end of the answer stays on screen as it grows or shrinks.
  const follow = useRef<number | null>(null);
  const drag = useRef<{ originY: number } | null>(null);
  const frame = useRef(0);
  const last = useRef(0);
  const article = useRef<HTMLElement>(null);
  const handle = useRef<HTMLDivElement>(null);

  const setShown = (next: number) => {
    unitsRef.current = next;
    setUnits(next);
  };
  const tick = (now: number) => {
    const ms = Math.min(64, now - last.current);
    last.current = now;
    const next = toward(unitsRef.current, targetRef.current, ms);
    setShown(next);
    frame.current = next === targetRef.current ? 0 : requestAnimationFrame(tick);
  };
  const aim = (next: number) => {
    targetRef.current = next;
    setTarget(next);
    if (!frame.current && next !== unitsRef.current) {
      last.current = performance.now();
      frame.current = requestAnimationFrame(tick);
    }
  };
  const startFollowing = () => {
    const bottom = article.current?.getBoundingClientRect().bottom;
    if (bottom !== undefined) follow.current = Math.min(bottom, window.innerHeight - 120);
  };
  const forward = () => {
    const at = targetRef.current;
    if (at > unitsRef.current + 1e-9) {
      startFollowing();
      setShown(at);
      return;
    }
    const next = nextStop(streamRef.current, at);
    if (next > at) {
      startFollowing();
      aim(next);
    } else wanted.current = true;
  };
  const back = () => {
    wanted.current = false;
    startFollowing();
    aim(prevStop(streamRef.current, unitsRef.current));
  };

  // A new question starts again at depth 1.
  useEffect(() => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    wanted.current = false;
    setShown(0);
    targetRef.current = 0;
    setTarget(0);
  }, [state.question]);
  // Depth 1 is always there in full, however it arrives.
  const lastFloor = useRef(0);
  useEffect(() => {
    if (targetRef.current <= lastFloor.current || targetRef.current < floor) {
      targetRef.current = floor;
      setTarget(floor);
      setShown(floor);
    }
    lastFloor.current = floor;
  }, [floor]);
  // A depth asked for while it was still being built starts writing when it arrives.
  useEffect(() => {
    if (wanted.current && nextStop(stream, targetRef.current) > targetRef.current && unitsRef.current >= targetRef.current) {
      wanted.current = false;
      startFollowing();
      aim(nextStop(stream, targetRef.current));
    }
  });
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // Follow the writing point: as the answer grows (or shrinks), the page scrolls by as much, so its end stays put.
  useLayoutEffect(() => {
    const el = article.current;
    if (follow.current === null || !el) return;
    const off = el.getBoundingClientRect().bottom - follow.current;
    if (Math.abs(off) > 0.5) window.scrollBy(0, off);
    if (unitsRef.current === targetRef.current) follow.current = null;
  });
  // The reader scrolling takes over from the follow; the writing carries on.
  useEffect(() => {
    const takeOver = () => {
      follow.current = null;
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.target !== handle.current && ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) takeOver();
    };
    window.addEventListener("wheel", takeOver, { passive: true });
    window.addEventListener("touchmove", takeOver, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", takeOver);
      window.removeEventListener("touchmove", takeOver);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const onKey = (event: KeyboardEvent) => {
    switch (event.key) {
      case "ArrowDown":
      case "PageDown":
      case "Enter":
      case " ":
        if (!event.repeat) forward();
        break;
      case "ArrowUp":
      case "PageUp":
        if (!event.repeat) back();
        break;
      case "Home":
        aim(floor);
        setShown(floor);
        break;
      case "End":
        aim(total);
        setShown(total);
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
  const goal = Math.max(floor, Math.min(target, total));
  const depths = Math.max(state.expectedLevels ?? state.levels.length, state.levels.length);
  const { depth, fill } = depthAt(stream, shown);
  const more = goal < total;
  const writing = goal > shown + 1e-9;
  const unwriting = goal < shown - 1e-9;
  const label = `Depth ${depth + 1} of ${depths}`;
  // While a depth writes itself, the band shows the reasoning behind it: why the agent added this depth.
  const reasoning = state.levels[depth]?.rationale;
  const nextDepth = depthAt(stream, nextStop(stream, goal)).depth;
  const invite =
    dy > 0
      ? more
        ? dy >= STEP_PULL
          ? `Release for depth ${nextDepth + 1}`
          : "Pull to expand"
        : building
          ? "Thinking deeper…"
          : "That's the full depth"
      : dy < 0
        ? dy <= -STEP_PULL && depth > 0
          ? "Release to go back a depth"
          : ""
        : writing
          ? reasoning || ""
          : "";
  const band = dy > 0 ? room(dy) : writing ? BAND : 0;
  const charge = dy > 0 && more ? Math.min(1, dy / STEP_PULL) : dy < 0 && depth > 0 ? -Math.min(1, -dy / STEP_PULL) : fill >= 1 && more ? 0 : fill;

  return (
    <ThemeProvider mode={mode}>
      <Card variant="card" width="full" className="answer-card stream" data-writing={writing || unwriting || undefined}>
        <article className="answer" ref={article}>
          {blocks(written(stream, shown), writing)}
        </article>
        <div className="pull-room" style={{ height: band }} aria-hidden>
          {band > 14 && invite && (
            <span className={writing && dy === 0 ? "reasoning" : undefined} key={writing && dy === 0 ? depth : "pull"}>
              {invite}
            </span>
          )}
        </div>
        <div
          ref={handle}
          className="pull-handle"
          role="slider"
          tabIndex={0}
          title={`${label}. ${more ? "Pull or press Down for the next depth" : "That's the full depth"}.`}
          aria-label="Depth of the answer: pull down or press Down for the next depth, Up to go back"
          aria-valuemin={Math.round(floor)}
          aria-valuemax={Math.round(total)}
          aria-valuenow={Math.round(goal)}
          aria-valuetext={label}
          data-pulling={dy !== 0 || undefined}
          onKeyDown={onKey}
          onPointerDown={(event) => {
            try {
              event.currentTarget.setPointerCapture(event.pointerId);
            } catch {
              // A synthetic pointer: the pull still works while it stays on the handle.
            }
            drag.current = { originY: event.clientY };
          }}
          onPointerMove={(event) => {
            if (drag.current) setDy(event.clientY - drag.current.originY);
          }}
          onPointerUp={(event) => {
            if (!drag.current) return;
            const pulled = event.clientY - drag.current.originY;
            drag.current = null;
            setDy(0);
            if (pulled >= STEP_PULL || Math.abs(pulled) < 4) forward();
            else if (pulled <= -STEP_PULL) back();
          }}
          onPointerCancel={() => {
            drag.current = null;
            setDy(0);
          }}
        >
          <Brain stage={stage(depth, depths)} charge={charge} depth={depth} />
          {shown <= floor && more && dy === 0 && <span className="hint">Pull to expand</span>}
        </div>
        {building && !more && !writing && dy === 0 && (
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
