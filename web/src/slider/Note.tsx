import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A note about the reading, folded to its title: a tap opens it as a small overlay over the analysis, and a tap
 * elsewhere or Escape closes it. Keeps the business context and the agent's exploration one tap away, not in the way.
 */
export function Note({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => box.current?.contains(event.target as Node) || setOpen(false);
    const esc = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <span className="note" ref={box} data-open={open || undefined}>
      <button type="button" className="note-title" aria-expanded={open} onClick={() => setOpen(!open)}>
        {title}
      </button>
      {open && (
        <span className="note-body" role="dialog" aria-label={title}>
          {children}
        </span>
      )}
    </span>
  );
}
