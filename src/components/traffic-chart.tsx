import { useEffect, useRef } from "react";
import type { TrafficSample } from "../types";
import { fmtSpeed, makeTrafficHistory, nextTraffic } from "../lib/mock";

/**
 * The chart runs its own rAF loop and writes path data straight to the DOM,
 * so the 1-second sample rate still reads as a fluid curve without
 * re-rendering the React tree 60 times a second. Points ease toward their
 * target values (zashboard/metacubexd-style smooth streaming).
 */
export function TrafficChart({ running }: { running: boolean }) {
  const downLine = useRef<SVGPathElement>(null);
  const downArea = useRef<SVGPathElement>(null);
  const upLine = useRef<SVGPathElement>(null);
  const upArea = useRef<SVGPathElement>(null);
  const upText = useRef<HTMLDivElement>(null);
  const downText = useRef<HTMLDivElement>(null);
  const state = useRef({
    target: makeTrafficHistory(),
    display: makeTrafficHistory().map((s) => ({ ...s })),
    live: { up: 0, down: 0 },
  });

  useEffect(() => {
    const W = 560;
    const H = 150;
    const s = state.current;
    let raf = 0;

    const maxOf = (arr: TrafficSample[], key: "up" | "down", floor: number) =>
      Math.max(...arr.map((v) => v[key]), floor);

    const buildPath = (data: number[], max: number) => {
      const step = W / Math.max(1, data.length - 1);
      let line = `M 0,${(H - (data[0] / max) * H).toFixed(1)}`;
      for (let i = 1; i < data.length; i++) {
        const y0 = H - (data[i - 1] / max) * H;
        const y1 = H - (data[i] / max) * H;
        const cx = ((i - 1) * step + i * step) / 2;
        line += ` C ${cx.toFixed(1)},${y0.toFixed(1)} ${cx.toFixed(1)},${y1.toFixed(1)} ${(i * step).toFixed(1)},${y1.toFixed(1)}`;
      }
      return { line, area: `${line} L ${W},${H} L 0,${H} Z` };
    };

    const frame = () => {
      if (!document.hidden) {
        // ease every displayed point toward its target
        for (let i = 0; i < s.target.length; i++) {
          s.display[i].up += (s.target[i].up - s.display[i].up) * 0.09;
          s.display[i].down += (s.target[i].down - s.display[i].down) * 0.09;
        }
        const downs = s.display.map((v) => v.down);
        const ups = s.display.map((v) => v.up);
        const d = buildPath(downs, maxOf(s.display, "down", 1e6));
        const u = buildPath(ups, maxOf(s.display, "up", 1e5));
        downLine.current?.setAttribute("d", d.line);
        downArea.current?.setAttribute("d", d.area);
        upLine.current?.setAttribute("d", u.line);
        upArea.current?.setAttribute("d", u.area);
        if (upText.current) upText.current.textContent = fmtSpeed(s.live.up);
        if (downText.current) downText.current.textContent = fmtSpeed(s.live.down);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const sample = window.setInterval(() => {
      if (document.hidden) return;
      const next = nextTraffic(s.target[s.target.length - 1]);
      s.live = next;
      s.target = [...s.target.slice(1), next];
    }, 1000);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(sample);
    };
  }, [running]);

  return (
    <div className="relative">
      <div className="flex items-end gap-6 mb-3">
        <div>
          <div className="text-xs opacity-50">↑ 上传</div>
          <div
            ref={upText}
            style={{ color: "var(--accent)" }}
            className="text-xl font-semibold font-mono"
          />
        </div>
        <div>
          <div className="text-xs opacity-50">↓ 下载</div>
          <div
            ref={downText}
            style={{ color: "var(--accent-2)" }}
            className="text-xl font-semibold font-mono"
          />
        </div>
        <div className="ml-auto text-xs opacity-50 font-mono">近 60 秒</div>
      </div>
      <svg viewBox="0 0 560 150" className="w-full h-[150px]" preserveAspectRatio="none">
        <defs>
          <linearGradient id="grad-down" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--accent-2)", stopOpacity: 0.35 }} />
            <stop offset="100%" style={{ stopColor: "var(--accent-2)", stopOpacity: 0 }} />
          </linearGradient>
          <linearGradient id="grad-up" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--accent)", stopOpacity: 0.4 }} />
            <stop offset="100%" style={{ stopColor: "var(--accent)", stopOpacity: 0 }} />
          </linearGradient>
          <filter id="curve-glow" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path ref={downArea} fill="url(#grad-down)" />
        <path ref={upArea} fill="url(#grad-up)" />
        <path
          ref={downLine}
          fill="none"
          className="stroke-[var(--accent-2)]"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#curve-glow)"
        />
        <path
          ref={upLine}
          fill="none"
          className="stroke-[var(--accent)]"
          strokeWidth="2"
          strokeLinecap="round"
          filter="url(#curve-glow)"
        />
      </svg>
    </div>
  );
}
