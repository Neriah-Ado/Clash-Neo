import { useMemo, useState } from "react";
import { Search, ScrollText } from "lucide-react";
import { GlassCard } from "../components/glass";
import { makeRules } from "../lib/mock";

export function RulesView() {
  const rules = useMemo(() => makeRules(), []);
  const [query, setQuery] = useState("");

  const filtered = rules.filter(
    (r) =>
      !query ||
      r.type.toLowerCase().includes(query.toLowerCase()) ||
      r.payload.toLowerCase().includes(query.toLowerCase()) ||
      r.proxy.includes(query),
  );

  return (
    <GlassCard className="p-5 fade-rise">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[13px] font-semibold tracking-wide opacity-60 uppercase">
          规则 · {filtered.length} 条
        </h2>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索规则…"
            className="glass-soft rounded-xl pl-8 pr-3 py-1.5 text-sm w-56 bg-transparent outline-none placeholder:opacity-40"
          />
        </div>
      </div>

      <div className="space-y-2 max-h-[calc(100vh-230px)] overflow-y-auto pr-1">
        {filtered.map((r) => (
          <div
            key={r.id}
            className="glass-soft glass-interactive flex items-center gap-3 px-3 py-2.5 text-sm"
          >
            <span className="glass-soft rounded-full px-2.5 py-0.5 text-[11px] font-mono w-fit">
              {r.type}
            </span>
            <span className="font-mono flex-1 truncate">
              {r.payload || <span className="opacity-40">— 匹配所有流量 —</span>}
            </span>
            <span className="glass-soft rounded-full px-3 py-1 text-xs font-medium w-fit">
              {r.proxy}
            </span>
            <span className="text-[11px] opacity-30 font-mono">
              {r.size === 3 ? "—" : `${r.size} 项`}
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-16 flex flex-col items-center gap-2 opacity-40">
            <ScrollText size={28} />
            <span className="text-sm">没有匹配的规则</span>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
