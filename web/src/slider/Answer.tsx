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
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { PanelView } from "../panels";
import { useAnswer, type AnswerStore } from "../state";
import { Brain } from "./Brain";
import { exploration } from "./explored";
import { QueryCard } from "./QueryCard";
import { stage } from "./pull";
import {
  buildStream,
  DEEP_BOOST,
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
 * next depth; it then writes itself below what is there at reading pace, charts drawing row by row. The page eases
 * along to keep the writing point in view until the reader scrolls themselves. Pulling again while a depth writes
 * skips to its end; pulling up goes back a depth.
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
  // While following: when it started, so the tail of a scroll gesture from before does not count as taking over.
  const follow = useRef<number | null>(null);
  const followFrame = useRef(0);
  const drag = useRef<{ originY: number } | null>(null);
  const frame = useRef(0);
  const last = useRef(0);
  const handle = useRef<HTMLDivElement>(null);

  const setShown = (next: number) => {
    unitsRef.current = next;
    setUnits(next);
  };
  const tick = (now: number) => {
    const ms = Math.min(64, now - last.current);
    last.current = now;
    const deep = depthAt(streamRef.current, unitsRef.current).depth >= 2;
    const next = toward(unitsRef.current, targetRef.current, ms, deep ? DEEP_BOOST : 1);
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
  // Follow the writing point: whenever the handle under it drifts out of the comfortable middle of the screen, the
  // page eases toward it a little each frame, so lines and charts arriving never jolt the page.
  const ease = () => {
    const el = handle.current;
    if (follow.current === null || !el) {
      followFrame.current = 0;
      return;
    }
    const { top, bottom } = el.getBoundingClientRect();
    const low = window.innerHeight * 0.75;
    const high = window.innerHeight * 0.25;
    const off = bottom > low ? bottom - low : top < high ? top - high : 0;
    if (Math.abs(off) >= 1) window.scrollBy(0, off * 0.16 + Math.sign(off));
    else if (unitsRef.current === targetRef.current) {
      follow.current = null;
      followFrame.current = 0;
      return;
    }
    followFrame.current = requestAnimationFrame(ease);
  };
  const startFollowing = () => {
    follow.current = performance.now();
    if (!followFrame.current) followFrame.current = requestAnimationFrame(ease);
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
  // Go straight to a depth from the rail: write on through the depths before it, or unwrite back to it.
  const goTo = (level: number) => {
    wanted.current = false;
    startFollowing();
    aim(depthEnd(streamRef.current, level));
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
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      cancelAnimationFrame(followFrame.current);
    },
    [],
  );

  // The reader scrolling takes over from the follow; the writing carries on.
  useEffect(() => {
    const takeOver = () => {
      if (follow.current !== null && performance.now() - follow.current > 300) follow.current = null;
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
  const band = room(dy);
  const contextOf = (level: number) => state.levels.find((l) => l.index === level)?.context ?? [];
  // The answer so far: the summary of the last depth written in full, replaced as each depth completes.
  const completed = fill >= 1 && !writing ? depth : Math.max(0, depth - 1);
  const soFar = state.digests.find((d) => d.level === completed);
  const nextDepth = depthAt(stream, nextStop(stream, goal)).depth;
  const nextQuestion = state.digests.find((d) => d.level === nextDepth)?.question ?? state.levels[nextDepth]?.title;
  const whyLevel = state.levels.find((l) => /why/i.test(l.title))?.index ?? Math.max(1, state.levels.length - 2);
  const explored = exploration(state.explored);
  // The bar says one thing: what a tap or a pull does now.
  const bar =
    dy >= STEP_PULL && more
      ? "Release to go deeper"
      : dy <= -STEP_PULL && depth > 0
        ? "Release to go back"
        : writing
          ? "Tap to finish this depth"
          : more
            ? (nextQuestion ?? "Go deeper")
            : building
              ? "Thinking deeper…"
              : "That's the full analysis";
  // What each depth found, in the narrator's few words, under its name on the rail once it is written.
  const finding = (level: number) => state.digests.find((d) => d.level === level)?.headline;
  const charge = dy > 0 && more ? Math.min(1, dy / STEP_PULL) : dy < 0 && depth > 0 ? -Math.min(1, -dy / STEP_PULL) : fill >= 1 && more ? 0 : fill;

  return (
    <ThemeProvider mode={mode}>
      <Card variant="card" width="full" className="answer-card stream" data-writing={writing || unwriting || undefined}>
        <header className="research-head">
          {soFar && (
            <p className="so-far" aria-live="polite">
              <span className="so-far-tag">So far</span>
              <span className="so-far-text" key={completed}>
                {soFar.summary || soFar.headline}
              </span>
            </p>
          )}
          <ol className="rail" aria-label="Depths of the analysis">
            {Array.from({ length: depths }, (_, i) => {
              const level = state.levels[i];
              const status =
                i < depth || (i === depth && fill >= 1 && !writing) ? "done" : i === depth ? "current" : i === nextDepth && more && !writing ? "next" : "ahead";
              return (
                <li key={i} data-status={status}>
                  <button type="button" disabled={!level || (status === "done" && i === depth)} onClick={() => goTo(i)}>
                    <span className="rail-dot" aria-hidden />
                    <span className="rail-label">{level?.title ?? "…"}</span>
                    {status === "done" && finding(i) && <span className="rail-finding">{finding(i)}</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </header>
        <article className="answer">
          {blocks(written(stream, shown), writing, {
            contextOf,
            exploredOn: whyLevel,
            explored:
              explored.queries > 0 ? (
                <p className="explored" key="explored">
                  <span className="context-tag">How the agent got here</span>
                  <span>
                    {explored.queries} exploratory {explored.queries === 1 ? "query" : "queries"}
                    {explored.profiles ? ` and ${explored.profiles} dimension ${explored.profiles === 1 ? "profile" : "profiles"}` : ""}, on{" "}
                    {explored.measures.slice(0, 8).join(" · ")}
                    {explored.across.length ? `, across ${explored.across.slice(0, 5).join(" · ")}` : ""}.
                  </span>
                </p>
              ) : null,
          })}
        </article>
        <div className="pull-room" style={{ height: band }} aria-hidden />
        <div
          ref={handle}
          className="depth-bar"
          role="button"
          tabIndex={0}
          aria-label={`${label}. ${bar}. Pull down or press Down for the next depth, Up to go back.`}
          data-pulling={dy !== 0 || undefined}
          data-idle={(!more && !writing) || undefined}
          onKeyDown={onKey}
          onPointerDown={(event) => {
            try {
              event.currentTarget.setPointerCapture(event.pointerId);
            } catch {
              // A synthetic pointer: the pull still works while it stays on the bar.
            }
            // Holding the bar stops the page following, so the bar stays under the finger.
            follow.current = null;
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
          <span className="grip" aria-hidden />
          <span className="bar-row">
            <Brain stage={stage(depth, depths)} charge={charge} depth={depth} />
            <span className="bar-label" aria-live="polite">
              {bar}
            </span>
            {(more || writing) && dy === 0 && (
              <span className="bar-arrow" aria-hidden>
                ↓
              </span>
            )}
          </span>
        </div>
      </Card>
    </ThemeProvider>
  );
}

/** The stream as written so far: each depth's question, its paragraph, and its panels as far as they have drawn. */
interface Extras {
  contextOf: (level: number) => string[];
  /** The depth that shows how the agent got here, and the note itself. */
  exploredOn: number;
  explored: ReactNode;
}

function blocks(items: Shown[], writing: boolean, { contextOf, exploredOn, explored }: Extras): ReactNode[] {
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
      // Once its question is written, a depth notes the business facts that shaped it.
      const facts = shown.progress >= 1 ? contextOf(item.level) : [];
      if (facts.length)
        result.push(
          <p className="context-note" key={`ctx-${item.level}`}>
            <span className="context-tag">Context</span>
            {facts.map((fact, i) => (
              <q key={i}>{fact.replace(/[`*]/g, "")}</q>
            ))}
          </p>,
        );
      if (shown.progress >= 1 && item.level === exploredOn && explored) result.push(explored);
    } else {
      result.push(
        item.evidence ? (
          <details className="evidence" key={item.id} style={shown.progress < 1 ? { opacity: shown.progress } : undefined}>
            <summary>
              <span className="evidence-tag">Evidence</span> {item.panel.title}
            </summary>
            <div className="inline-panel">
              <PanelView panel={item.panel} />
              {item.panel.query && <QueryCard query={item.panel.query} />}
            </div>
          </details>
        ) : (
          <div className="inline-panel" key={item.id}>
            <PanelView panel={item.panel} drawn={shown.progress >= 1 ? undefined : drawnOf(shown)} />
            {shown.progress >= 1 && item.panel.query && <QueryCard query={item.panel.query} />}
          </div>
        ),
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
