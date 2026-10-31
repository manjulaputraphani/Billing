/**
 * Reusable empty state: a small illustration (inline SVG, coloured with
 * currentColor so it adapts to every theme), a message and an optional action.
 */
import type { ReactNode } from "react";

export type EmptyIllustration = "expenses" | "items" | "purchases" | "invoices";

function Illustration({ kind }: { kind: EmptyIllustration }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg viewBox="0 0 96 96" className="h-24 w-24 shrink-0 text-primary" aria-hidden="true" focusable="false">
      <circle cx="48" cy="48" r="44" fill="currentColor" opacity="0.08" />
      {kind === "expenses" && (
        <g {...common}>
          <path d="M30 20h36v52l-6-4-6 4-6-4-6 4-6-4-6 4Z" />
          <path d="M48 32v24M42 38h6a3 3 0 0 1 0 6h-4a3 3 0 0 0 0 6h6" />
        </g>
      )}
      {kind === "items" && (
        <g {...common}>
          <path d="m48 24 22 12v24L48 72 26 60V36Z" />
          <path d="M26 36l22 12 22-12" />
          <path d="M48 48v24" />
          <path d="m37 30 22 12" />
        </g>
      )}
      {kind === "purchases" && (
        <g {...common}>
          <path d="M24 30h6l6 26h26l6-18H38" />
          <circle cx="42" cy="66" r="3.5" />
          <circle cx="62" cy="66" r="3.5" />
          <path d="M52 26h16M60 18v16" />
        </g>
      )}
      {kind === "invoices" && (
        <g {...common}>
          <path d="M34 18h20l10 10v50H34Z" />
          <path d="M54 18v12h10" />
          <path d="M42 44h14M42 54h14M42 64h8" />
        </g>
      )}
    </svg>
  );
}

export type EmptyStateProps = {
  illustration: EmptyIllustration;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: ReactNode;
  /** Compact = a short, wide card (used on the dashboard). */
  compact?: boolean;
};

export default function EmptyState({
  illustration,
  title,
  message,
  actionLabel,
  onAction,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 text-center ${
        compact ? "max-h-40 py-4" : "py-10"
      }`}
    >
      <Illustration kind={illustration} />
      <p className="text-sm font-medium text-ink">{title}</p>
      {message ? <p className="max-w-xs text-xs text-muted">{message}</p> : null}
      {action ??
        (actionLabel && onAction ? (
          <button type="button" className="btn btn-primary mt-1" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null)}
    </div>
  );
}
