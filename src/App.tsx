import { useEffect, useState } from "react";
import {
  Gauge,
  Home,
  Network,
  Rss,
  ScrollText,
  Settings,
  Terminal,
  Waypoints,
} from "lucide-react";
import { HomeView } from "./views/home";
import { ProfilesView } from "./views/profiles";
import { loadProfile } from "./lib/mock";
import { ProxiesView } from "./views/proxies";
import { ConnectionsView } from "./views/connections";
import { RulesView } from "./views/rules";
import { LogsView } from "./views/logs";
import { SettingsView } from "./views/settings";
import type { AppSettings } from "./types";

const nav = [
  { id: "home", label: "首页", icon: Home, view: HomeView },
  { id: "profiles", label: "订阅", icon: Rss, view: ProfilesView },
  { id: "proxies", label: "代理", icon: Gauge, view: ProxiesView },
  { id: "connections", label: "连接", icon: Network, view: ConnectionsView },
  { id: "rules", label: "规则", icon: Waypoints, view: RulesView },
  { id: "logs", label: "日志", icon: Terminal, view: LogsView },
  { id: "settings", label: "设置", icon: Settings, view: null },
] as const;

type NavId = (typeof nav)[number]["id"];

export function App() {
  const [page, setPage] = useState<NavId>("home");
  const [settings, setSettings] = useState<AppSettings>({
    theme: "dark",
    glassStrength: 22,
    specOpacity: 45,
    liquidSpeed: 26,
    refraction: true,
    stress: false,
    language: "zh",
  });

  const applySettings = (patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      const root = document.documentElement;
      root.classList.toggle("dark", next.theme !== "light");
      root.dataset.theme = next.theme;
      root.style.setProperty("--blur-radius", `${next.glassStrength}px`);
      root.style.setProperty("--spec-opacity", String(next.specOpacity / 100));
      root.style.setProperty("--liquid-speed", `${next.liquidSpeed}s`);
      if (patch.stress !== undefined) {
        loadProfile.targetConnections = next.stress ? 2000 : 9;
      }
      return next;
    });
  };

  useEffect(() => {
    applySettings({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ActiveView = nav.find((n) => n.id === page)!.view!;
  const paneClass = `glass ${settings.refraction ? "glass-refract" : ""}`;
  return (
    <div className="h-full flex p-3 gap-3">
      {/* SVG displacement rig: turbulence-noise edge refraction, applied
          through backdrop-filter on the two main panes (Chromium). */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <filter id="liquid-refraction" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.006 0.011"
            numOctaves="2"
            seed="11"
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="5" result="soft" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="soft"
            scale="42"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      {/* Floating glass sidebar */}
      <aside className={`${paneClass} w-56 shrink-0 flex flex-col p-4`}>
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="h-10 w-10 rounded-2xl glass glass-active flex items-center justify-center">
            <ScrollText size={18} />
          </div>
          <div>
            <div className="font-semibold leading-tight">Clash-Neo</div>
            <div className="text-[11px] opacity-50 tracking-widest">LIQUID GLASS</div>
          </div>
        </div>

        <nav className="mt-4 space-y-1.5">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-300 ${
                page === id
                  ? "glass-active font-semibold shadow-[0_4px_16px_rgba(59,130,246,0.2)]"
                  : "opacity-70 hover:opacity-100 hover:bg-white/25 dark:hover:bg-white/5"
              }`}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-auto">
          <div className="glass glass-soft rounded-2xl p-3 text-[11px] opacity-60 leading-relaxed">
            界面灵感来自 clash-verge-rev (GPL-3.0)，材质参考 Apple Liquid Glass。
            <br />
            演示项目 · 本地模拟数据
          </div>
        </div>
      </aside>

      {/* Content pane */}
      <main className={`${paneClass} flex-1 min-w-0 overflow-y-auto p-5`}>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">
            {nav.find((n) => n.id === page)!.label}
          </h1>
          <div className="flex items-center gap-2 text-xs opacity-50">
            <span className="h-2 w-2 rounded-full bg-emerald-500 pulse-dot" />
            mihomo · 规则模式 · 系统代理已接管
          </div>
        </div>
        {page === "settings" ? (
          <div className="h-[calc(100%-3.5rem)] overflow-y-auto">
            <SettingsView settings={settings} onChange={applySettings} />
          </div>
        ) : page === "logs" || page === "connections" ? (
          <div className="h-[calc(100%-3.5rem)] flex flex-col">
            <ActiveView />
          </div>
        ) : (
          <ActiveView />
        )}
      </main>
    </div>
  );
}
