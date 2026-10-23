import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Hand-rolled fixed-row virtualization.
 *
 * Why not "render everything + memo": metacubexd#1277 (3000+ connections
 * makes the connections page unusable and memory keeps climbing) and
 * metacubexd#1987 (the connections page's real-time refresh is the main CPU
 * sink) are both DOM-size problems — memoizing thousands of rows still
 * leaves thousands of live DOM nodes. Only a windowed list keeps both DOM
 * size and reconciliation cost flat as the connection count grows.
 *
 * Scroll handling is rAF-coalesced and passive; sticky-bottom tail mode
 * serves the log stream without fighting the user's scroll position.
 */
export function VirtualList<T>({
  items,
  rowHeight,
  overscan = 8,
  className = "",
  keyOf,
  renderRow,
  tail = false,
}: {
  items: T[];
  rowHeight: number;
  overscan?: number;
  className?: string;
  keyOf: (item: T, index: number) => string;
  renderRow: (item: T, index: number) => ReactNode;
  tail?: boolean;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [win, setWin] = useState({ start: 0, end: 0 });
  const frame = useRef(0);
  const sticky = useRef(true);

  const recompute = useCallback(() => {
    const el = viewport.current;
    if (!el) return;
    const start = Math.max(0, Math.floor(el.scrollTop / rowHeight) - overscan);
    const end = Math.min(
      items.length,
      Math.ceil((el.scrollTop + el.clientHeight) / rowHeight) + overscan,
    );
    setWin((w) => (w.start === start && w.end === end ? w : { start, end }));
  }, [items.length, rowHeight, overscan]);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const onScroll = () => {
      sticky.current =
        el.scrollTop + el.clientHeight >= el.scrollHeight - rowHeight * 2;
      if (!frame.current) {
        frame.current = requestAnimationFrame(recompute);
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    recompute();
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (frame.current) {
        cancelAnimationFrame(frame.current);
        frame.current = 0;
      }
    };
  }, [recompute, rowHeight]);

  useEffect(() => {
    recompute();
    const el = viewport.current;
    if (tail && sticky.current && el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [items.length, recompute, tail]);

  return (
    <div ref={viewport} className={`overflow-y-auto ${className}`}>
      <div style={{ height: items.length * rowHeight, position: "relative" }}>
        {items
          .slice(win.start, Math.max(win.end, win.start))
          .map((item, i) => (
            <div
              key={keyOf(item, win.start + i)}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: rowHeight,
                transform: `translateY(${(win.start + i) * rowHeight}px)`,
                contain: "layout style paint",
              }}
            >
              {renderRow(item, win.start + i)}
            </div>
          ))}
      </div>
    </div>
  );
}
