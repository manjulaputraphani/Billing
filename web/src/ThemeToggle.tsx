import { useSyncExternalStore, type ReactNode } from "react";
import { getMode, setMode, subscribeMode, type ThemeMode } from "./theme";

function IconSun() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.5 13.6A8.2 8.2 0 0 1 10.4 3.5a8.2 8.2 0 1 0 10.1 10.1Z" />
    </svg>
  );
}

function IconAuto() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

const OPTIONS: { key: ThemeMode; label: string; icon: ReactNode }[] = [
  { key: "light", label: "Light", icon: <IconSun /> },
  { key: "dark", label: "Dark", icon: <IconMoon /> },
  { key: "system", label: "System", icon: <IconAuto /> },
];

/** Sun / moon / system switch. `onDark` styles it for the coffee-brown rail. */
export default function ThemeToggle({ onDark = false, className = "" }: { onDark?: boolean; className?: string }) {
  const mode = useSyncExternalStore(subscribeMode, getMode, getMode);
  return (
    <div className={`theme-switch ${onDark ? "on-dark" : ""} ${className}`.trim()} role="group" aria-label="Colour theme">
      {OPTIONS.map((option) => (
        <button
          key={option.key}
          type="button"
          title={option.label}
          aria-label={`${option.label} theme`}
          aria-pressed={mode === option.key}
          onClick={() => setMode(option.key)}
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
}
