import type { ReactNode } from "react";

/**
 * Responsive form grid shared by the data-entry pages.
 *
 * - mobile: one field per row
 * - tablet: 2–3 fields per row (callers can override)
 * - desktop ≥1200px: one row, using the `desktop` track template
 *
 * Callers pass literal Tailwind classes (so the JIT can see them), e.g.
 * `desktop="min-[1200px]:grid-cols-[2fr_1fr_1fr_1fr_auto]"`.
 */
export type FormRowProps = {
  children: ReactNode;
  /** Single-row layout at >=1200px. */
  desktop: string;
  /** Tablet layout. Defaults to 2 columns, then 3 from md. */
  tablet?: string;
  className?: string;
};

export default function FormRow({
  children,
  desktop,
  tablet = "sm:grid-cols-2 md:grid-cols-3",
  className = "",
}: FormRowProps) {
  return (
    <div className={`grid grid-cols-1 gap-3 ${tablet} ${desktop} ${className}`}>
      {children}
    </div>
  );
}
