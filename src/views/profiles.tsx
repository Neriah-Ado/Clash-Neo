import { useEffect, useState } from "react";
import {
  ClipboardPaste,
  CloudDownload,
  RefreshCw,
  Rss,
  Trash2,
  Sparkles,
} from "lucide-react";
import { GlassCard, SectionTitle } from "../components/glass";
import type { Profile } from "../types";
import {
  activateProfile,
  fmtBytes,
  getActiveProfile,
  getProfiles,
  importProfile,
  refreshProfile,
  removeProfile,
  PROFILE_ACTIVATED,
} from "../lib/mock";
import { toast } from "../lib/toast";

function fmtDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ProfilesView() {
  const [profiles, setProfiles] = useState<Profile[]>(() => getProfiles());
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // keep in sync when activation happens on this page or elsewhere
  useEffect(() => {
    const sync = () => setProfiles([...getProfiles()]);
    window.addEventListener(PROFILE_ACTIVATED, sync);
    return () => window.removeEventListener(PROFILE_ACTIVATED, sync);
  }, []);

  const run = async (key: string, fn: () => Promise<void> | void) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const doImportUrl = () =>
    run("import", async () => {
      const p = await importProfile({ kind: "url", url: url.trim() });
      setProfiles([...getProfiles()]);
      setUrl("");
      toast.push(`订阅「${p.name}」导入成功，${p.nodeCount} 个节点`, "success");
    });

  const doImportLinks = () =>
    run("import", async () => {
      const text = await navigator.clipboard.readText().catch(() => "");
      if (!text.trim()) throw new Error("剪贴板为空，请先复制分享链接");
      const p = await importProfile({ kind: "links", text });
      setProfiles([...getProfiles()]);
      toast.push(`已解析 ${p.nodeCount} 条分享链接并导入`, "success");
    });

  const doImportDemo = () =>
    run("import", async () => {
      const p = await importProfile({ kind: "demo" });
      setProfiles([...getProfiles()]);
      toast.push(`已导入「${p.name}」`, "success");
    });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 fade-rise">
      {/* Import card */}
      <GlassCard className="p-5 xl:col-span-1 h-fit">
        <SectionTitle title="导入订阅" />
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && url.trim() && doImportUrl()}
              placeholder="https://provider.example/sub?token=..."
              className="glass-soft rounded-xl px-3 py-2 text-sm flex-1 bg-transparent outline-none placeholder:opacity-40 font-mono"
            />
            <button
              onClick={doImportUrl}
              disabled={busy !== null || !url.trim()}
              className="glass glass-interactive rounded-xl px-4 text-sm font-medium
                flex items-center gap-1.5 disabled:opacity-40"
            >
              <CloudDownload size={15} />
              {busy === "import" ? "拉取中" : "导入"}
            </button>
          </div>

          {busy === "import" && (
            <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-sky-400 to-indigo-400 import-progress" />
            </div>
          )}

          <div className="flex items-center gap-2 text-xs opacity-40">
            <div className="h-px flex-1 bg-current" /> 或 <div className="h-px flex-1 bg-current" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={doImportLinks}
              disabled={busy !== null}
              className="glass-soft glass-interactive rounded-xl px-3 py-2.5 text-xs
                flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <ClipboardPaste size={14} />
              剪贴板分享链接
            </button>
            <button
              onClick={doImportDemo}
              disabled={busy !== null}
              className="glass-soft glass-interactive rounded-xl px-3 py-2.5 text-xs
                flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <Sparkles size={14} />
              导入演示订阅
            </button>
          </div>

          <p className="text-[11px] opacity-40 leading-relaxed">
            支持机场订阅 URL（模拟拉取与解析），或直接粘贴 ss:// vmess://
            vless:// trojan:// hysteria2:// tuic:// 分享链接。
          </p>

          {error && (
            <div className="rounded-xl bg-rose-400/15 px-3 py-2 text-xs text-rose-600 dark:text-rose-300">
              {error}
            </div>
          )}
        </div>
      </GlassCard>

      {/* Profile list */}
      <div className="xl:col-span-2 space-y-3 stagger">
        {profiles.map((p) => {
          const active = p.id === getActiveId();
          const usedPct = p.total > 0 ? Math.min(100, ((p.upload + p.download) / p.total) * 100) : 0;
          return (
            <GlassCard key={p.id} interactive className={`p-4 ${active ? "ring-2 ring-sky-400/50" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="glass-soft h-10 w-10 rounded-2xl flex items-center justify-center shrink-0">
                  <Rss size={17} className="opacity-70" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{p.name}</span>
                    {active && (
                      <span className="glass-active rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0">
                        使用中
                      </span>
                    )}
                    <span className="glass-soft rounded-full px-2 py-0.5 text-[10px] opacity-60 shrink-0">
                      {p.source === "url" ? "URL" : p.source === "links" ? "分享链接" : "演示"}
                    </span>
                  </div>
                  <div className="text-[11px] opacity-50 mt-0.5 font-mono truncate">
                    {p.nodeCount} 节点 · 更新于 {fmtDate(p.updatedAt)}
                    {p.url ? ` · ${p.url}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!active && (
                    <button
                      onClick={() => {
                        activateProfile(p.id);
                        toast.push(`已切换到「${p.name}」，代理页节点已更新`, "success");
                      }}
                      className="glass glass-interactive rounded-xl px-3 py-1.5 text-xs font-medium"
                    >
                      启用
                    </button>
                  )}
                  <button
                    onClick={() =>
                      run(`refresh-${p.id}`, async () => {
                        await refreshProfile(p.id);
                        setProfiles([...getProfiles()]);
                        toast.push(`「${p.name}」已更新`, "success");
                      })
                    }
                    disabled={busy !== null}
                    className="glass-soft glass-interactive rounded-xl p-2 disabled:opacity-40"
                    title="更新订阅"
                  >
                    <RefreshCw size={14} className={busy === `refresh-${p.id}` ? "animate-spin" : ""} />
                  </button>
                  <button
                    onClick={() => {
                      removeProfile(p.id);
                      setProfiles([...getProfiles()]);
                      toast.push(`已删除「${p.name}」`);
                    }}
                    className="glass-soft glass-interactive rounded-xl p-2 text-rose-500"
                    title="删除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* traffic bar, subscription-userinfo style */}
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all duration-500"
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
                <span className="text-[11px] opacity-50 font-mono shrink-0">
                  {fmtBytes(p.upload + p.download)} / {p.total > 0 ? fmtBytes(p.total) : "不限"}
                </span>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

function getActiveId(): string | null {
  return getActiveProfile()?.id ?? null;
}
