import { useEffect, useState } from "react";
import { Activity, Globe, Shield, Zap } from "lucide-react";
import { GlassCard, SectionTitle } from "../components/glass";
import { TrafficChart } from "../components/traffic-chart";
import type { ClashStatus } from "../types";
import { fetchConnections, fetchStatus, fmtBytes } from "../lib/mock";
import { useCountUp, usePausableInterval } from "../lib/hooks";

export function HomeView() {
  const [status, setStatus] = useState<ClashStatus | null>(null);
  const [totals, setTotals] = useState({ conns: 0, up: 0, down: 0 });

  usePausableInterval(() => {
    fetchConnections().then((cs) => {
      setTotals({
        conns: cs.length,
        up: cs.reduce((a, c) => a + c.up, 0),
        down: cs.reduce((a, c) => a + c.down, 0),
      });
    });
  }, 1200);

  useEffect(() => {
    fetchStatus().then(setStatus);
  }, []);

  const conns = useCountUp(totals.conns);
  const up = useCountUp(totals.up);
  const down = useCountUp(totals.down);

  const stats = [
    { icon: Activity, label: "活动连接", value: String(Math.round(conns)) },
    { icon: Zap, label: "累计上传", value: fmtBytes(up) },
    { icon: Globe, label: "累计下载", value: fmtBytes(down) },
    { icon: Shield, label: "内核", value: status?.coreVersion ?? "—" },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 stagger">
      <GlassCard className="xl:col-span-2 p-5">
        <SectionTitle title="实时流量" />
        <TrafficChart running={status?.running ?? false} />
      </GlassCard>

      <GlassCard className="p-5">
        <SectionTitle title="核心状态" />
        <div className="space-y-3 text-sm">
          {[
            ["运行状态", status?.running ? "● 运行中" : "○ 已停止"],
            ["出站模式", { rule: "规则", global: "全局", direct: "直连" }[status?.mode ?? "rule"]],
            ["TUN 模式", status?.tunEnabled ? "已开启" : "未开启"],
            ["系统代理", status?.systemProxy ? "已接管" : "未接管"],
            ["面板版本", status?.version ?? "—"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between">
              <span className="opacity-60">{k}</span>
              <span className="font-medium">{v}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-400/15 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-500 pulse-dot" />
          液态玻璃演示数据 · 未连接真实内核
        </div>
      </GlassCard>

      {stats.map(({ icon: Icon, label, value }) => (
        <GlassCard key={label} interactive className="p-5 flex items-center gap-4">
          <div className="glass-soft h-11 w-11 rounded-2xl flex items-center justify-center">
            <Icon size={20} className="opacity-70" />
          </div>
          <div>
            <div className="text-xs opacity-50">{label}</div>
            <div className="text-lg font-semibold font-mono">{value}</div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
