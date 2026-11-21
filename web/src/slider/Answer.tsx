import "@openuidev/react-ui/styles/openui-defaults.css";
import "@openuidev/react-ui/styles/shared.css";
import "@openuidev/react-ui/styles/card.css";
import "@openuidev/react-ui/styles/button.css";
import "@openuidev/react-ui/styles/table.css";
import "@openuidev/react-ui/styles/metricIndicator.css";
import "@openuidev/react-ui/styles/charts.css";
import "@openuidev/react-ui/styles/tooltipWrapper.css";
import { Button } from "@openuidev/react-ui/parts/Button/Button";
import { Card } from "@openuidev/react-ui/parts/Card/Card";
import { ThemeProvider } from "@openuidev/react-ui/parts/ThemeProvider/ThemeProvider";
import { useSystemThemeMode } from "@openuidev/react-ui/parts/ThemeProvider/useSystemThemeMode";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { PanelView } from "../panels";
import { lastPosition, useAnswer, type AnswerStore } from "../state";
import { heightAt, monotone, positionAt, stops, type Point, type Stop } from "./fit";
import { reveal, withFallbacks, type Piece } from "./stretch";

const GLIDE_MS = 450;
const KEY_STEP = 32;

/**
 * The answer in a card the reader resizes. Dragging the bottom edge down gives the answer more room, and the text
 * grows to fill it: the next level's words appear in place, and each chart is uncovered by the edge right after the
 * sentence that introduces it.
 */
export function ResizableAnswer({ store }: { store: AnswerStore }) {
  const state = useAnswer(store);
  const mode = useSystemThemeMode();
  const reachable = lastPosition(state);
  const segments = useMemo(() => withFallbacks(state.narration, state.levels), [state.narration, state.levels]);
  const layout = useMemo(() => stops(segments, state.levels, reachable), [segments, state.levels, reachable]);
  const [points, setPoints] = useState<Point[]>([]);
  const [height, setHeight] = useState<number | null>(null);
  const drag = useRef<{ y: number; h: number } | null>(null);
  const frame = useRef(0);
  const body = useRef<HTMLDivElement>(null);

  const measured = useCallback((next: Point[]) => {
    setPoints((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  }, []);

  // A new level, new text or a new width re-measures the map; keep showing the same position.
  useEffect(() => {
    if (!drag.current && points.length) setHeight(heightAt(points, store.getState().position));
  }, [points, store]);

  const first = points[0]?.height ?? 0;
  const last = points[points.length - 1]?.height ?? 0;
  const shown = height ?? first;

  const resize = (h: number) => {
    const clamped = Math.min(Math.max(h, first), last);
    setHeight(clamped);
    store.slide(positionAt(points, clamped));
  };
  const glide = (target: number) => {
    cancelAnimationFrame(frame.current);
    const from = shown;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / GLIDE_MS, 1);
      resize(from + (target - from) * (1 - (1 - t) ** 3));
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  };
  const toLevel = (level: number) => glide(heightAt(points, level));
  const onKey = (event: KeyboardEvent) => {
    const moves: Record<string, () => void> = {
      ArrowDown: () => resize(shown + KEY_STEP),
      ArrowUp: () => resize(shown - KEY_STEP),
      PageDown: () => toLevel(Math.min(Math.floor(state.position) + 1, reachable)),
      PageUp: () => toLevel(Math.max(Math.ceil(state.position) - 1, 0)),
      Home: () => toLevel(0),
      End: () => toLevel(reachable),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    cancelAnimationFrame(frame.current);
    move();
  };

  // Fade the bottom edge only while it cuts through the answer.
  useLayoutEffect(() => {
    const el = body.current;
    const article = el?.querySelector(":scope > article.answer");
    if (el && article instanceof HTMLElement) el.classList.toggle("clipped", article.offsetHeight > shown + 2);
  });

  const building = state.status === "loading" || state.status === "streaming";
  const total = state.expectedLevels ?? state.levels.length + (building ? 1 : 0);
  const note = state.notes[state.notes.length - 1];
  if (state.levels.length === 0) return building ? <p className="progress">{note ?? "Starting…"}</p> : null;
  const pieces = reveal(segments, state.levels, state.position);

  return (
    <ThemeProvider mode={mode}>
      <Card variant="card" width="full" className="answer-card">
        <div ref={body} className="answer-body" style={points.length ? { height: shown } : undefined}>
          <Measurer layout={layout} onMeasure={measured} />
          <article className="answer">{blocks(pieces, true)}</article>
        </div>
        <div
          className="resize-handle"
          role="slider"
          tabIndex={0}
          aria-label="Answer detail: drag down for more"
          aria-valuemin={0}
          aria-valuemax={Math.max(total - 1, 0)}
          aria-valuenow={Number(state.position.toFixed(2))}
          aria-valuetext={state.levels[Math.round(state.position)]?.title}
          onKeyDown={onKey}
          onPointerDown={(event) => {
            cancelAnimationFrame(frame.current);
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { y: event.clientY, h: shown };
          }}
          onPointerMove={(event) => drag.current && resize(drag.current.h + event.clientY - drag.current.y)}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          <span className="grip" />
          {state.position === 0 && reachable > 0 && <span className="hint">Drag down for more detail</span>}
        </div>
        <footer className="answer-foot">
          <ol className="levels">
            {Array.from({ length: total }, (_, i) => {
              const level = state.levels[i];
              return (
                <li key={i}>
                  <Button
                    variant="tertiary"
                    size="extra-small"
                    disabled={!level || i > reachable}
                    aria-current={Math.abs(state.position - i) < 0.5}
                    onClick={() => toLevel(i)}
                  >
                    {level ? level.title : "…"}
                  </Button>
                </li>
              );
            })}
          </ol>
          {building && (
            <p className="progress" aria-live="polite">
              {note ?? "Building the answer…"}
            </p>
          )}
        </footer>
      </Card>
    </ThemeProvider>
  );
}

/** Renders every stop off-screen at the answer's width and reports their heights, so height maps to detail. */
function Measurer({ layout, onMeasure }: { layout: Stop[]; onMeasure: (points: Point[]) => void }) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => {
      const heights = Array.from(el.children, (child) => (child as HTMLElement).offsetHeight);
      onMeasure(monotone(layout.map((stop, i) => ({ position: stop.position, height: heights[i] ?? 0 }))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [layout, onMeasure]);
  return (
    <div ref={root} className="measure" aria-hidden>
      {layout.map((stop, i) => (
        <article className="answer" key={i}>
          {blocks(stop.pieces, false)}
        </article>
      ))}
    </div>
  );
}

/** The answer's paragraphs, with each panel right after the segment that introduces it. */
function blocks(pieces: Piece[], live: boolean): ReactNode[] {
  const result: ReactNode[] = [];
  let paragraph: Piece[] = [];
  const flush = () => {
    if (paragraph.length) result.push(<Paragraph key={`p-${paragraph[0]!.segment.id}`} pieces={paragraph} live={live} />);
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

function Paragraph({ pieces, live }: { pieces: Piece[]; live: boolean }) {
  return (
    <p className="stretch">
      {pieces.map((piece) => (
        <span className={`segment level-${piece.segment.level}`} key={piece.segment.id}>
          {live
            ? piece.words.slice(0, piece.shown).map((word, i) => (
                <span className="word" key={i}>
                  {word}{" "}
                </span>
              ))
            : `${piece.words.slice(0, piece.shown).join(" ")} `}
        </span>
      ))}
    </p>
  );
}
