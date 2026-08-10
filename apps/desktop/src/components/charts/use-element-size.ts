import { useLayoutEffect, useState, type RefObject } from "react";

export type ElementSize = {
  width: number;
  height: number;
};

/**
 * Tracks the rendered size of `ref`, so an SVG can be drawn in real pixels
 * instead of guessing a viewBox and letting the browser stretch the strokes.
 *
 * Measures in a layout effect (before paint) and then follows changes through
 * `ResizeObserver`. Environments without one — jsdom, and any browser old
 * enough to matter, which the Tauri webview is not — keep the single
 * measurement and follow window resizes, which covers the case the app
 * actually has: a chart that fills a resizable window.
 *
 * Returns zeros until the first measurement lands; callers decide what to draw
 * in the meantime.
 */
export function useElementSize(ref: RefObject<HTMLElement | null>): ElementSize {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      setSize((current) =>
        // Bail on equal values: ResizeObserver fires on every layout pass and
        // an unconditional setState would re-render the chart continuously.
        current.width === width && current.height === height
          ? current
          : { width, height }
      );
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
