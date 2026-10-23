import { Sparkles } from "lucide-react";
import { GlassCard, GlassSlider, GlassToggle, SectionTitle } from "../components/glass";
import type { AppSettings, ThemeId } from "../types";

const THEMES: Array<{ id: ThemeId; name: string; sub: string; bg: string; dot: string }> = [
  {
    id: "dark",
    name: "黑曜",
    sub: "默认 · 深空蓝",
    bg: "linear-gradient(135deg, #0b0e1a, #1b2440)",
    dot: "#3b82f6",
  },
  {
    id: "light",
    name: "浅色",
    sub: "晴空玻璃",
    bg: "linear-gradient(135deg, #eef4ff, #dbe4f8)",
    dot: "#0ea5e9",
  },
  {
    id: "rhine",
    name: "莱茵生命",
    sub: "实验室荧光",
    bg: "linear-gradient(135deg, #0c0d0a, #2a3112)",
    dot: "#d9f64a",
  },
  {
    id: "re",
    name: "生化危机",
    sub: "血色警报",
    bg: "linear-gradient(135deg, #0a0506, #331010)",
    dot: "#ef4444",
  },
];

interface Props {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}

export function SettingsView({ settings, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 fade-rise">
      <GlassCard className="p-5">
        <SectionTitle title="外观" />
        <div className="space-y-4 text-sm">
          <div>
            <div className="font-medium mb-2.5">主题风格</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {THEMES.map((t) => {
                const selected = settings.theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onChange({ theme: t.id })}
                    className={`rounded-2xl p-2.5 text-left transition-all duration-300 ${
                      selected ? "glass-active" : "glass-soft glass-interactive"
                    }`}
                  >
                    <div
                      className="h-12 rounded-xl mb-2 relative overflow-hidden"
                      style={{ background: t.bg }}
                    >
                      <span
                        className="absolute right-2 bottom-2 h-2.5 w-2.5 rounded-full"
                        style={{ background: t.dot, boxShadow: `0 0 10px ${t.dot}` }}
                      />
                    </div>
                    <div className="text-xs font-medium">{t.name}</div>
                    <div className="text-[10px] opacity-50 mt-0.5">{t.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <Row label="语言 / Language" note="演示项目，仅中文">
            <span className="glass-soft rounded-full px-3 py-1 text-xs">中文</span>
          </Row>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <SectionTitle title="液态玻璃材质" />
        <div className="space-y-5 text-sm">
          <Row label="磨砂强度" note={`${settings.glassStrength}%`}>
            <GlassSlider
              value={settings.glassStrength}
              min={4}
              max={60}
              onChange={(v) => onChange({ glassStrength: v })}
            />
          </Row>
          <Row label="高光锐度" note={`${settings.specOpacity}%`}>
            <GlassSlider
              value={settings.specOpacity}
              min={0}
              max={100}
              onChange={(v) => onChange({ specOpacity: v })}
            />
          </Row>
          <Row label="边缘折射" note="实验特性 · SVG 位移贴图（仅 Chromium）">
            <GlassToggle
              checked={settings.refraction}
              onChange={(v) => onChange({ refraction: v })}
            />
          </Row>
          <Row label="流动速度" note={`${settings.liquidSpeed}s`}>
            <GlassSlider
              value={settings.liquidSpeed}
              min={8}
              max={60}
              onChange={(v) => onChange({ liquidSpeed: v })}
            />
          </Row>
          <Row label="高负载压测" note="2000 条模拟连接，验证虚拟滚动">
            <GlassToggle
              checked={settings.stress}
              onChange={(v) => onChange({ stress: v })}
            />
          </Row>
          <p className="text-xs opacity-50 flex items-center gap-1.5">
            <Sparkles size={12} />
            所有材质参数实时写入 CSS 变量，全窗口即时生效。
          </p>
        </div>
      </GlassCard>

      <GlassCard className="p-5 xl:col-span-2">
        <SectionTitle title="系统设置" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="glass glass-soft rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">系统代理</div>
              <div className="text-xs opacity-50 mt-0.5">接管系统 HTTP/SOCKS 设置</div>
            </div>
            <GlassToggle checked onChange={() => {}} />
          </div>
          <div className="glass glass-soft rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">TUN 模式</div>
              <div className="text-xs opacity-50 mt-0.5">虚拟网卡全局接管（演示）</div>
            </div>
            <GlassToggle checked={false} onChange={() => {}} />
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function Row({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="font-medium">{label}</div>
        {note && <div className="text-xs opacity-50 mt-0.5 font-mono">{note}</div>}
      </div>
      {children}
    </div>
  );
}
