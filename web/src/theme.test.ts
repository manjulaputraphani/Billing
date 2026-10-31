import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyTheme,
  getMode,
  prefersDark,
  resolveTheme,
  setMode,
  subscribeMode,
  watchSystemTheme,
} from "./theme";

/** Minimal matchMedia stub whose `matches` can be flipped by the test. */
function stubMatchMedia(matches: boolean) {
  const listeners = new Set<(event: { matches: boolean }) => void>();
  const media = {
    matches,
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_: string, fn: (event: { matches: boolean }) => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: (event: { matches: boolean }) => void) => listeners.delete(fn),
    dispatch(matches: boolean) {
      media.matches = matches;
      for (const fn of listeners) fn({ matches });
    },
  };
  vi.stubGlobal("matchMedia", vi.fn(() => media));
  return media;
}

describe("theme", () => {
  beforeEach(() => {
    stubMatchMedia(false);
    setMode("system"); // reset the module-level mode between tests
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves an explicit mode without asking the system", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("follows the system preference in system mode", () => {
    stubMatchMedia(true);
    expect(prefersDark()).toBe(true);
    expect(resolveTheme("system")).toBe("dark");
    stubMatchMedia(false);
    expect(resolveTheme("system")).toBe("light");
  });

  it("writes the resolved theme onto the document element", () => {
    applyTheme("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    applyTheme("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("stores the chosen mode and notifies listeners", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeMode(listener);
    setMode("dark");
    expect(localStorage.getItem("sdhhe-theme")).toBe("dark");
    expect(getMode()).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(listener).toHaveBeenCalled();
    unsubscribe();
    setMode("light");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("follows a live system change only while in system mode", () => {
    const media = stubMatchMedia(false);
    const stop = watchSystemTheme();

    media.dispatch(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    setMode("light");
    media.dispatch(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    stop();
  });
});
