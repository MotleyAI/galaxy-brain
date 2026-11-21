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
import { lastPosition, useAnswer, type AnswerStore, type Segment } from "../state";
import { Brain } from "./Brain";
import { charge, Pull, pulledDepth, stage, stretch, writingMs } from "./pull";
import { reveal, withFallbacks, type Piece } from "./stretch";

const FOLD_MS = 280;
const UNFOLD_MS = 900;
const SETTLE_MS = 300;
const EDGE = 56;
const SCROLL_STEP = 8;
const FOLLOW_AT = 0.8;
const FOLLOW_TO = 0.6;

function wordsBetween(segments: Segment[], from: number, to: number): number {
  return segments
    .filter((s) => s.level > from && s.level <= to)
    .reduce((sum, s) => sum + s.text.split(/\s+/).filter(Boolean).length, 0);
}

/**
 * The answer at a depth the reader unlocks. It always shows its current depth in full. Pulling the handle down opens
 * room while the brain charges; past the threshold the next depth writes itself into the text and its charts unfold.
 * Pulling up folds a depth away. Near the bottom of the window the page scrolls, so the pull can go on.
 */
export function ResizableAnswer({ store }: { store: AnswerStore }) {
  const state = useAnswer(store);
  const mode = useSystemThemeMode();
  const reachable = lastPosition(state);
  const segments = useMemo(() => withFallbacks(state.narration, state.levels), [state.narration, state.levels]);
  const [depth, setDepth] = useState(0);
  const [pull, setPull] = useState(0);
  const depthRef = useRef(0);
  const reachRef = useRef(reachable);
  const drag = useRef<{ pull: Pull; clientY: number } | null>(null);
  const writing = useRef(0);
  const scrolling = useRef(0);
  const handle = useRef<HTMLDivElement>(null);
  const article = useRef<HTMLElement>(null);
  const followUntil = useRef(0);
  reachRef.current = reachable;

  const go = (next: number) => {
    depthRef.current = next;
    setDepth(next);
  };

  // A new question starts again at the single number.
  useEffect(() => go(0), [state.question]);

  // Write the unlocked depth in word by word (or fold it away), keeping the handle on screen as the answer grows.
  useEffect(() => {
    const from = store.getState().position;
    const to = Math.min(depth, reachable);
    if (from === to) return;
    const grows = to > from;
    const ms = grows ? writingMs(wordsBetween(segments, Math.floor(from), to)) : FOLD_MS;
    const start = performance.now();
    followUntil.current = grows ? Number.POSITIVE_INFINITY : 0;
    const step = (now: number) => {
      const t = Math.min((now - start) / ms, 1);
      store.slide(from + (to - from) * (grows ? t : 1 - (1 - t) ** 2));
      if (t < 1) writing.current = requestAnimationFrame(step);
      else if (grows) followUntil.current = now + UNFOLD_MS;
    };
    cancelAnimationFrame(writing.current);
    writing.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(writing.current);
  }, [depth, reachable, segments, store]);

  // While a new depth writes itself in and its charts unfold, keep the handle on screen: the page scrolls with it.
  useEffect(() => {
    const el = article.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const box = handle.current?.getBoundingClientRect();
      if (!box || performance.now() > followUntil.current) return;
      // Once the handle nears the bottom, bring it back to about 60% down the window, leaving room for the next pull.
      if (box.bottom > window.innerHeight * FOLLOW_AT) window.scrollBy(0, box.bottom - window.innerHeight * FOLLOW_TO);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [state.levels.length > 0]);

  const track = () => {
    const current = drag.current;
    if (!current) return;
    const now = performance.now();
    const dy = current.pull.distance(current.clientY, now);
    const from = depthRef.current;
    const next = pulledDepth(from, dy, reachRef.current);
    if (next !== from) {
      go(next);
      // One depth per pull: wait until this one has written itself in, then count a fresh pull.
      const settle = next > from ? writingMs(wordsBetween(segments, from, next)) + SETTLE_MS : FOLD_MS + SETTLE_MS;
      current.pull.spend(now, settle);
      setPull(0);
    } else {
      setPull(dy);
    }
  };
  // While the finger rests near the window's edge in the direction of the pull, scroll the page so the pull can go
  // on. Only this scrolling counts toward the pull; the page following an unfolding depth does not.
  const edgeScroll = () => {
    const current = drag.current;
    if (!current) return;
    const now = performance.now();
    if (!current.pull.isSpent(now)) {
      const dy = current.pull.distance(current.clientY, now);
      const step =
        current.clientY > window.innerHeight - EDGE && dy > 0 ? SCROLL_STEP : current.clientY < EDGE && dy < 0 ? -SCROLL_STEP : 0;
      if (step) {
        const before = window.scrollY;
        window.scrollBy(0, step);
        current.pull.scrolled(window.scrollY - before);
      }
    }
    track();
    scrolling.current = requestAnimationFrame(edgeScroll);
  };
  const release = () => {
    drag.current = null;
    cancelAnimationFrame(scrolling.current);
    setPull(0);
  };
  const onKey = (event: KeyboardEvent) => {
    const moves: Record<string, number> = {
      ArrowDown: depthRef.current + 1,
      PageDown: depthRef.current + 1,
      ArrowUp: depthRef.current - 1,
      PageUp: depthRef.current - 1,
      Home: 0,
      End: reachRef.current,
    };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    go(Math.max(0, Math.min(target, reachRef.current)));
  };

  const building = state.status === "loading" || state.status === "streaming";
  const total = Math.max(state.expectedLevels ?? state.levels.length + (building ? 1 : 0), state.levels.length);
  const note = state.notes[state.notes.length - 1];
  if (state.levels.length === 0) return building ? <p className="progress">{note ?? "Starting…"}</p> : null;

  const shown = Math.min(depth, reachable);
  const current = state.levels[shown];
  const next = state.levels[shown + 1];
  const canUnlock = shown < reachable;
  const room = stretch(pull, canUnlock);
  const label = `Depth ${shown + 1} of ${total}: ${current?.title ?? ""}`;
  const invite = canUnlock
    ? `${charge(pull) > 0.85 ? "Almost there: keep pulling" : "Pull"} to unlock ${next?.title ?? "the next depth"}`
    : shown + 1 < total
      ? (note ?? "Thinking deeper…")
      : "That is the deepest analysis";

  return (
    <ThemeProvider mode={mode}>
      <Card variant="card" width="full" className="answer-card">
        <article className="answer" ref={article}>{blocks(reveal(segments, state.levels, state.position))}</article>
        <div className="pull-room" style={{ height: room }} aria-hidden>
          {room > 24 && <span>{invite}</span>}
        </div>
        <div
          ref={handle}
          className="pull-handle"
          role="slider"
          tabIndex={0}
          title={`${label}. ${invite}.`}
          aria-label="Depth of the answer: pull down to unlock more"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={shown + 1}
          aria-valuetext={label}
          data-pulling={pull !== 0 || undefined}
          onKeyDown={onKey}
          onPointerDown={(event) => {
            if (event.currentTarget.hasPointerCapture?.(event.pointerId) === false) {
              try {
                event.currentTarget.setPointerCapture(event.pointerId);
              } catch {
                // A synthetic or already-released pointer: the pull still works while it stays on the handle.
              }
            }
            drag.current = { pull: new Pull(event.clientY), clientY: event.clientY };
            cancelAnimationFrame(scrolling.current);
            scrolling.current = requestAnimationFrame(edgeScroll);
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            drag.current.clientY = event.clientY;
            track();
          }}
          onPointerUp={release}
          onPointerCancel={release}
        >
          <Brain stage={stage(shown, total)} charge={charge(pull)} depth={shown} />
          {shown === 0 && canUnlock && pull === 0 && <span className="hint">Pull down to think deeper</span>}
        </div>
        {building && shown === reachable && pull === 0 && (
          <p className="progress" aria-live="polite">
            {note ?? "Thinking deeper…"}
          </p>
        )}
      </Card>
    </ThemeProvider>
  );
}

/** The answer's paragraphs, with each panel right after the segment that introduces it. */
function blocks(pieces: Piece[]): ReactNode[] {
  const result: ReactNode[] = [];
  let paragraph: Piece[] = [];
  const flush = () => {
    if (paragraph.length) result.push(<Paragraph key={`p-${paragraph[0]!.segment.id}`} pieces={paragraph} />);
    paragraph = [];
  };
  for (const piece of pieces) {
    if (piece.shown > 0) paragraph.push(piece);
    if (piece.panel) {
      flush();
      result.push(
        <div className="inline-panel" key={`panel-${piece.panel.id}`}>
          <PanelView panel={piece.panel} />
        </div>,
      );
    }
  }
  flush();
  return result;
}

function Paragraph({ pieces }: { pieces: Piece[] }) {
  return (
    <p className="stretch">
      {pieces.map((piece) => (
        <span className={`segment level-${piece.segment.level}`} key={piece.segment.id}>
          {piece.words.slice(0, piece.shown).map((word, i) => (
            <span className="word" key={i}>
              {word}{" "}
            </span>
          ))}
        </span>
      ))}
    </p>
  );
}
