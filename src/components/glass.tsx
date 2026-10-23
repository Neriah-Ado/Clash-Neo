import { memo, type CSSProperties, type ReactNode } from "react";
import { useCursorGlow } from "../lib/hooks";

export function GlassCard({
  children,
  className = "",
  interactive = false,
  style,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  style?: CSSProperties;
}) {
  const ref = useCursorGlow<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={style}
      className={`glass ${interactive ? "glass-interactive glass-glow" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export const MemoGlassCard = memo(GlassCard);

export function SectionTitle({
  title,
  extra,
}: {
  title: string;
  extra?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[13px] font-semibold tracking-wide opacity-60 uppercase">
        {title}
      </h2>
      {extra}
    </div>
  );
}

export function GlassToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-13 rounded-full transition-all duration-300 ${
        checked ? "glass-active" : "glass-soft"
      }`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full transition-all duration-300
        bg-white/95 shadow-[0_2px_8px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.9)]
        backdrop-blur-sm ${checked ? "left-[26px]" : "left-0.5"}`}
      />
    </button>
  );
}

export function GlassSlider({
  value,
  min = 0,
  max = 100,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="relative h-7 w-40 glass-soft rounded-full overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 rounded-full slider-fill"
        style={{ width: `calc(${pct}% )`, minWidth: 28 }}
      />
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
      <span
        className="absolute top-0.5 h-6 w-6 -ml-3 rounded-full pointer-events-none
        bg-white/95 shadow-[0_2px_10px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.9)]"
        style={{ left: `calc(${pct}% )`, minWidth: 24 }}
      />
    </div>
  );
}

export const LatencyBadge = memo(function LatencyBadge({
  delay,
}: {
  delay?: number | null;
}) {
  if (delay == null)
    return (
      <span className="rounded-full px-2 py-0.5 text-xs glass-soft opacity-60">
        超时
      </span>
    );
  const tone =
    delay < 120
      ? "text-emerald-600 dark:text-emerald-400"
      : delay < 300
        ? "text-amber-600 dark:text-amber-400"
        : "text-rose-600 dark:text-rose-400";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs glass-soft font-mono ${tone}`}>
      {delay} ms
    </span>
  );
});
