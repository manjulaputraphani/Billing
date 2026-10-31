/**
 * "Last 14 days" sales/expenses chart.
 *
 * - y-axis with rupee values in Indian format (₹1,200 / ₹1.2L) and light gridlines
 * - hover (desktop) and tap (mobile) shows a tooltip with date, sales and expenses
 * - bars with a value of 0 are not drawn at all
 */
import { useRef, useState } from "react";

export type DailyPoint = { date: string; sales: string; expenses: string };

/** Indian short form: ₹950 · ₹1,200 · ₹1.2L · ₹12.5L */
export function rupeesShort(paise: number): string {
  const rupees = Math.abs(paise) / 100;
  const sign = paise < 0 ? "-" : "";
  if (rupees >= 10_000_000) return `${sign}₹${(rupees / 10_000_000).toFixed(rupees >= 100_000_000 ? 0 : 1)}Cr`;
  if (rupees >= 100_000) return `${sign}₹${(rupees / 100_000).toFixed(rupees >= 1_000_000 ? 0 : 1)}L`;
  return `${sign}₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(rupees)}`;
}

/** Full amount with paise, Indian grouping: ₹1,234.50 */
export function rupeesFull(paise: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100);
}

/** Round the top of the scale up to a friendly number (1 / 2 / 2.5 / 5 × 10ⁿ). */
function niceMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const scaled = value / magnitude;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 5 ? 5 : 10;
  return step * magnitude;
}

const GRID_LINES = 4; // 0 → max in 4 steps (5 lines)

export default function SalesChart({ data }: { data: DailyPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  // A tap fires compatibility mouse events right after the touch (pointerenter /
  // pointerleave with pointerType "mouse"). Those must not close the tooltip
  // again, so a short window after a touch is ignored.
  const lastTouch = useRef(0);
  const touchedRecently = () => Date.now() - lastTouch.current < 800;

  const points = data.map((day) => ({
    date: day.date,
    sales: Number(day.sales) || 0,
    expenses: Number(day.expenses) || 0,
  }));
  const peak = points.reduce((max, point) => Math.max(max, point.sales, point.expenses), 0);

  // Nothing happened in the window — show a quiet message instead of a dead axis.
  if (peak === 0) {
    return (
      <div className="flex h-full min-h-[144px] items-center justify-center">
        <p className="text-sm text-muted">No sales or expenses in the last 14 days</p>
      </div>
    );
  }

  // With no data the scale would be 0 → show a sensible ₹100 axis instead.
  const max = niceMax(Math.max(peak, 10_000));

  const ticks = Array.from({ length: GRID_LINES + 1 }, (_, index) => (max / GRID_LINES) * index);

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 gap-2">
        {/* y-axis */}
        <div
          className="flex w-12 shrink-0 flex-col justify-between text-[10px] text-muted"
          aria-hidden="true"
        >
          {[...ticks].reverse().map((tick) => (
            <span key={tick} className="leading-none">
              {rupeesShort(tick)}
            </span>
          ))}
        </div>

        {/* plot */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-[144px] flex-1">
            {/* gridlines */}
            {ticks.map((tick) => (
              <div
                key={tick}
                className="pointer-events-none absolute inset-x-0 border-t border-line/60"
                style={{ bottom: `${(tick / max) * 100}%` }}
              />
            ))}
            {/* bars */}
            <div className="absolute inset-0 flex items-end gap-1">
              {points.map((point, index) => (
                <div
                  key={point.date}
                  className="flex h-full flex-1 cursor-default flex-col items-center justify-end gap-[2px]"
                  onPointerEnter={(event) => {
                    if (event.pointerType === "touch") lastTouch.current = Date.now();
                    setActive(index);
                  }}
                  onPointerLeave={() => {
                    if (touchedRecently()) return; // the mouse events after a tap
                    setActive((current) => (current === index ? null : current));
                  }}
                  onPointerDown={(event) => {
                    if (event.pointerType === "touch") lastTouch.current = Date.now();
                    setActive(index);
                  }}
                >
                  <div className="flex h-full w-full items-end justify-center gap-[2px]">
                    {point.sales > 0 && (
                      <div
                        className="w-1/2 rounded-t bg-chart-1"
                        style={{ height: `${Math.max(2, (point.sales / max) * 100)}%` }}
                      />
                    )}
                    {point.expenses > 0 && (
                      <div
                        className="w-1/2 rounded-t bg-chart-5"
                        style={{ height: `${Math.max(2, (point.expenses / max) * 100)}%` }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* tooltip */}
            {active !== null && points[active] ? (
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] shadow-lg"
                style={{
                  // keep the tooltip inside the plot, even on the first/last day
                  left: `${Math.min(88, Math.max(12, points.length > 1 ? (active / (points.length - 1)) * 100 : 50))}%`,
                  bottom: `${Math.min(78, Math.max(8, (Math.max(points[active].sales, points[active].expenses) / max) * 100))}%`,
                }}
              >
                <p className="font-medium text-ink">{points[active].date}</p>
                <p className="text-muted">
                  Sales <span className="text-ink">{rupeesFull(points[active].sales)}</span>
                </p>
                <p className="text-muted">
                  Expenses <span className="text-ink">{rupeesFull(points[active].expenses)}</span>
                </p>
              </div>
            ) : null}
          </div>

          {/* x-axis labels */}
          <div className="mt-1 flex gap-1">
            {points.map((point) => (
              <span key={point.date} className="flex-1 text-center text-[9px] text-muted">
                {point.date.slice(8)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
