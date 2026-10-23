import { memo, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Unplug } from "lucide-react";
import { GlassCard } from "../components/glass";
import { VirtualList } from "../components/virtual-list";
import type { Connection } from "../types";
import { fetchConnections, fmtSpeed } from "../lib/mock";
import { usePausableInterval } from "../lib/hooks";

const ROW_H = 46;

const ConnRow = memo(function ConnRow({ c }: { c: Connection }) {
  return (
    <div className="glass-soft h-full flex items-center gap-x-3 px-3 text-sm
      grid grid-cols-[1fr_1.4fr_90px_110px_110px_36px]">
      <span className="font-medium truncate">{c.host}</span>
      <span className="truncate opacity-60 text-xs">
        {c.rule} <span className="opacity-50">→ {c.chain}</span>
      </span>
      <span className="glass-soft rounded-full px-2 py-0.5 text-[10px] uppercase w-fit">
        {c.network}
      </span>
      <span className="font-mono text-xs flex items-center gap-1 text-sky-600 dark:text-sky-300">
        <ArrowUp size={11} />
        {fmtSpeed(c.up)}
      </span>
      <span className="font-mono text-xs flex items-center gap-1 text-indigo-600 dark:text-indigo-300">
        <ArrowDown size={11} />
        {fmtSpeed(c.down)}
      </span>
      <span className="font-mono text-[11px] opacity-40">
        {Math.round((Date.now() - c.startAt) / 1000)}s
      </span>
    </div>
  );
});

export function ConnectionsView() {
  const [conns, setConns] = useState<Connection[]>([]);
  const [query, setQuery] = useState("");

  usePausableInterval(() => {
    fetchConnections().then(setConns);
  }, 1500);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? conns.filter((c) => c.host.toLowerCase().includes(q)) : conns;
  }, [conns, query]);

  return (
    <GlassCard className="p-5 fade-rise flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-[13px] font-semibold tracking-wide opacity-60 uppercase">
            活动连接 · {filtered.length}
          </h2>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索主机…"
          className="glass-soft rounded-xl px-3 py-1.5 text-sm w-56 bg-transparent outline-none placeholder:opacity-40"
        />
      </div>

      <div className="grid grid-cols-[1fr_1.4fr_90px_110px_110px_36px] gap-x-3 px-3 pb-2 text-[11px] uppercase tracking-wide opacity-40 shrink-0">
        <span>主机</span>
        <span>规则 / 链路</span>
        <span>类型</span>
        <span>上传</span>
        <span>下载</span>
        <span />
      </div>

      <VirtualList
        items={filtered}
        rowHeight={ROW_H}
        className="flex-1 pr-1"
        keyOf={(c) => c.id}
        renderRow={(c) => <ConnRow c={c} />}
      />

      {filtered.length === 0 && (
        <div className="py-16 flex flex-col items-center gap-2 opacity-40">
          <Unplug size={28} />
          <span className="text-sm">没有匹配的连接</span>
        </div>
      )}
    </GlassCard>
  );
}
