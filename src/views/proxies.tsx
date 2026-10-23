import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Gauge, RefreshCw, Repeat } from "lucide-react";
import { GlassCard, LatencyBadge, SectionTitle } from "../components/glass";
import type { ProxyGroup, ProxyNode } from "../types";
import {
  activeGroups,
  latencyTest,
  PROFILE_ACTIVATED,
  regionOf,
} from "../lib/mock";
import { toast } from "../lib/toast";
import { usePausableInterval } from "../lib/hooks";

const typeLabel: Record<string, string> = {
  Selector: "手动",
  URLTest: "自动",
  Fallback: "故障",
};

const FAILover_THRESHOLD = 300; // ms

const NodeTile = memo(function NodeTile({
  node,
  selected,
  onClick,
}: {
  node: ProxyNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`glass-soft glass-interactive text-left px-3 py-2.5 ${selected ? "glass-active" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            node.alive ? "bg-emerald-500" : "bg-rose-500"
          }`}
        />
        <span className="text-sm font-medium truncate">{node.name}</span>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[11px] opacity-40 font-mono truncate max-w-[120px]">
          {node.server}
        </span>
        <LatencyBadge delay={node.delay} />
      </div>
    </button>
  );
});

/**
 * Regional auto-failover (mihomo url-test keeps the pool global, which
 * lets a "香港" selector silently land on a US node; this monitor instead
 * only ever moves within the same region prefix, so exit-country
 * guarantees survive a latency spike).
 */
function failoverTick(
  prev: ProxyGroup[],
  threshold: number,
): { groups: ProxyGroup[]; switched: string[] } {
  const switched: string[] = [];
  const groups = prev.map((g) => {
    const nodes = g.nodes.map((n) => {
      if (!n.alive) {
        // small chance of recovery
        return Math.random() < 0.15
          ? { ...n, alive: true, delay: Math.round(120 + Math.random() * 260) }
          : n;
      }
      let delay = Math.max(25, Math.round(n.delay! * (0.92 + Math.random() * 0.22)));
      if (Math.random() < 0.04) delay = Math.round(320 + Math.random() * 560); // spike
      const dead = Math.random() < 0.02;
      return { ...n, delay: dead ? null : delay, alive: !dead };
    });

    let now = nodes.some((n) => n.name === g.now) ? g.now : "";

    if (g.type === "URLTest") {
      const best = nodes
        .filter((n) => n.alive)
        .sort((a, b) => a.delay! - b.delay!)[0];
      now = best?.name ?? now;
    } else if (g.type === "Selector") {
      const current = nodes.find((n) => n.name === now);
      const degraded =
        !current || !current.alive || (current.delay ?? Infinity) > threshold;
      if (degraded) {
        const region = current ? regionOf(current.name) : "";
        const candidate = nodes
          .filter(
            (n) =>
              n.alive &&
              n.name !== now &&
              n.delay != null &&
              n.delay < threshold &&
              regionOf(n.name) === region,
          )
          .sort((a, b) => a.delay! - b.delay!)[0];
        if (candidate) {
          if (current) {
            switched.push(
              `${now.split(" ·")[0]} → ${candidate.name.split(" ·")[0]}（${current.delay ?? "超时"} → ${candidate.delay}ms）`,
            );
          }
          now = candidate.name;
        }
      }
    }

    return { ...g, nodes, now: now || g.now };
  });
  return { groups, switched };
}

export function ProxiesView() {
  const [groups, setGroups] = useState<ProxyGroup[]>(() => activeGroups());
  const [activeId, setActiveId] = useState("g-main");
  const [testing, setTesting] = useState(false);
  const [autoFailover, setAutoFailover] = useState(true);
  const groupsRef = useRef(groups);
  const failoverRef = useRef(autoFailover);
  groupsRef.current = groups;
  failoverRef.current = autoFailover;

  useEffect(() => {
    const regen = () => {
      const next = activeGroups();
      setGroups(next);
      setActiveId((id) => (next.some((g) => g.id === id) ? id : "g-main"));
    };
    window.addEventListener(PROFILE_ACTIVATED, regen);
    return () => window.removeEventListener(PROFILE_ACTIVATED, regen);
  }, []);

  // latency drift monitor: also drives url-test selection and regional failover
  usePausableInterval(() => {
    const { groups: next, switched } = failoverTick(
      groupsRef.current,
      FAILover_THRESHOLD,
    );
    setGroups(next);
    for (const msg of switched.slice(0, 2)) {
      toast.push(`同地区自动切换：${msg}`, "warn");
    }
  }, 3000);

  const group = useMemo(
    () => groups.find((g) => g.id === activeId)!,
    [groups, activeId],
  );

  const selectNode = (nodeId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === activeId && g.type === "Selector"
          ? { ...g, now: g.nodes.find((n) => n.id === nodeId)!.name }
          : g,
      ),
    );
  };

  const runTest = () => {
    setTesting(true);
    setTimeout(() => {
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          nodes: g.nodes.map((n) => {
            const next =
              Math.random() < 0.08 ? null : Math.round(30 + Math.random() * 420);
            return {
              ...n,
              delay: next,
              alive: next !== null,
              history: [...n.history.slice(1), next ?? 0],
            };
          }),
        })),
      );
      setTesting(false);
    }, 700);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 fade-rise">
      <GlassCard className="p-3 space-y-1.5 h-fit">
        <SectionTitle title="代理组" />
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setActiveId(g.id)}
            className={`w-full text-left px-3 py-2.5 rounded-xl transition-all ${
              g.id === activeId ? "glass-active" : "hover:bg-white/30 dark:hover:bg-white/5"
            }`}
          >
            <div className="text-sm font-medium truncate">{g.name}</div>
            <div className="mt-0.5 flex items-center justify-between text-[11px] opacity-50">
              <span>
                {typeLabel[g.type]} · {g.nodes.length} 节点
              </span>
              <span className="truncate max-w-[90px]">{g.now}</span>
            </div>
          </button>
        ))}
      </GlassCard>

      <GlassCard className="lg:col-span-3 p-5 h-fit">
        <SectionTitle
          title={group.name}
          extra={
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAutoFailover(!autoFailover);
                  toast.push(
                    autoFailover
                      ? "已关闭同地区自动切换"
                      : `已开启同地区自动切换（阈值 ${FAILover_THRESHOLD}ms）`,
                  );
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl transition-all ${
                  autoFailover ? "glass-active font-medium" : "glass-soft opacity-70"
                }`}
                title="当前节点延迟超标或掉线时，自动切换到同地区最优节点"
              >
                <Repeat size={13} />
                同地区自动切换
              </button>
              <button
                onClick={runTest}
                disabled={testing}
                className="glass glass-interactive flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl disabled:opacity-50"
              >
                <RefreshCw size={13} className={testing ? "animate-spin" : ""} />
                {testing ? "测速中" : "延迟测速"}
              </button>
            </div>
          }
        />
        <div className="mb-3 flex items-center gap-2 text-xs opacity-60">
          <Gauge size={13} />
          当前使用：<span className="font-medium opacity-90">{group.now}</span>
          {autoFailover && (
            <span className="opacity-50">· 高于 {FAILover_THRESHOLD}ms 自动换同地区节点</span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 stagger">
          {group.nodes.map((n) => (
            <NodeTile
              key={n.id}
              node={n}
              selected={group.now === n.name}
              onClick={() => selectNode(n.id)}
            />
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
