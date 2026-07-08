import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// RTL's auto-cleanup relies on a global `afterEach`, which we don't have
// since vitest.config's `test.globals` is left off (tests import explicitly
// from "vitest" instead). Register it manually so each test starts fresh.
afterEach(() => {
  cleanup();
});

// jsdom doesn't implement matchMedia; useDarkMode relies on it to read the
// prefers-color-scheme signal.
// jsdom doesn't implement scrollIntoView; ChatThread calls it to keep the
// latest message in view.
if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = () => {};
}

if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;
}
