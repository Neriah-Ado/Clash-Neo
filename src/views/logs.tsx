import { memo, useState } from "react";
import { Eraser } from "lucide-react";
import { GlassCard } from "../components/glass";
import { VirtualList } from "../components/virtual-list";
import type { LogEntry } from "../types";
import { fetchLogs } from "../lib/mock";
import { usePausableInterval } from "../lib/hooks";

const ROW_H = 26;

const levels: Array<LogEntry["level"] | "all"> = ["all", "info", "warning", "error", "debug"];

const levelTone: Record<LogEntry["level"], string> = {
  info: "text-sky-600 dark:text-sky-300",
  warning: "text-amber-600 dark:text-amber-300",
  error: "text-rose-600 dark:text-rose-300",
  debug: "text-emerald-600 dark:text-emerald-300",
};

const LogRow = memo(function LogRow({ l }: { l: LogEntry }) {
  return (
    <div className="h-full flex items-center gap-3 px-2 font-mono text-xs whitespace-nowrap">
      <span className="opacity-40 shrink-0">{l.time}</span>
      <span className={`shrink-0 uppercase w-12 ${levelTone[l.level]}`}>{l.level}</span>
      <span className="opacity-80 truncate">{l.payload}</span>
    </div>
  );
});

export function LogsView() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [level, setLevel] = useState<(typeof levels)[number]>("all");

  usePausableInterval(
    () =>
      fetchLogs().then((fresh) =>
        // ring buffer: capping the array is what keeps a long session from
        // turning into the "memory fills up until you close the tab" defect
        setLogs((prev) => [...prev.slice(-(512 - fresh.length)), ...fresh]),
      ),
    2000,
  );

  const shown = level === "all" ? logs : logs.filter((l) => l.level === level);

  return (
    <GlassCard className="p-5 fade-rise flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[13px] font-semibold tracking-wide opacity-60 uppercase">
          实时日志
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            {levels.map((lv) => (
              <button
                key={lv}
                onClick={() => setLevel(lv)}
                className={`px-3 py-1.5 rounded-xl text-xs transition-all ${
                  level === lv ? "glass-active font-medium" : "glass-soft opacity-70"
                }`}
              >
                {lv === "all" ? "全部" : lv}
              </button>
            ))}
          </div>
          <button
            onClick={() => setLogs([])}
            className="glass-soft glass-interactive rounded-xl p-2"
            title="清空"
          >
            <Eraser size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <VirtualList
          items={shown}
          rowHeight={ROW_H}
          tail
          className="h-full font-mono"
          keyOf={(l) => l.id}
          renderRow={(l) => <LogRow l={l} />}
        />
      </div>
    </GlassCard>
  );
}
