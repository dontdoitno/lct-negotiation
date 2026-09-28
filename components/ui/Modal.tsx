"use client";

import { ReactNode, useCallback, useEffect, useRef } from "react";

/**
 * Dialog with a focus trap, Esc handling and focus returned to whatever opened
 * it. `onRequestClose` fires for Esc and backdrop clicks so the caller can ask
 * for confirmation before discarding input, per the spec.
 */
export function Modal({
  open,
  onRequestClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onRequestClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (e.key !== "Tab" || !panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("input, textarea, button")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onRequestClose();
        return;
      }
      trapFocus(e);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      restoreFocusTo.current?.focus();
    };
  }, [open, onRequestClose, trapFocus]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onRequestClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[92vh] w-full max-w-reading flex-col rounded-lg border-[1.5px] border-border-strong bg-surface"
      >
        <header className="border-b-[1.5px] border-border px-6 py-4">
          <h2 className="text-[19px] font-bold text-primary">{title}</h2>
          {subtitle && <p className="mt-1 text-[14px] text-secondary">{subtitle}</p>}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>

        {footer && <footer className="border-t-[1.5px] border-border px-6 py-4">{footer}</footer>}
      </div>
    </div>
  );
}
