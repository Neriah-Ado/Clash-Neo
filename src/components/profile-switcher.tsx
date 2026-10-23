import { useEffect, useState } from "react";
import { Check, ChevronDown, Rss } from "lucide-react";
import type { Profile } from "../types";
import {
  activateProfile,
  getActiveProfile,
  getProfiles,
  PROFILE_ACTIVATED,
} from "../lib/mock";
import { toast } from "../lib/toast";

/**
 * Persistent quick switcher in the sidebar: every page is one click away
 * from swapping the active subscription — no detour through the profiles
 * page. Node pools rebuild via the PROFILE_ACTIVATED event.
 */
export function ProfileSwitcher() {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>(() => getProfiles());
  const activeId = getActiveProfile()?.id ?? null;
  const active = profiles.find((p) => p.id === activeId);

  useEffect(() => {
    const sync = () => setProfiles([...getProfiles()]);
    window.addEventListener(PROFILE_ACTIVATED, sync);
    return () => window.removeEventListener(PROFILE_ACTIVATED, sync);
  }, []);

  return (
    <div className="relative mt-3 px-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full glass-soft glass-interactive rounded-xl px-3 py-2
          flex items-center gap-2 text-xs"
      >
        <Rss size={13} className="shrink-0 opacity-70" />
        <span className="flex-1 truncate text-left font-medium">
          {active?.name ?? "无订阅"}
        </span>
        <ChevronDown
          size={13}
          className={`shrink-0 opacity-50 transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className="glass absolute left-1 right-1 top-full mt-1.5 p-1.5
            space-y-1 z-30 fade-rise"
          style={{ animationDuration: "0.25s" }}
        >
          {profiles.map((p) => {
            const isActive = p.id === activeId;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setOpen(false);
                  if (!isActive) {
                    activateProfile(p.id);
                    toast.push(
                      `快速切换 →「${p.name}」（${p.nodeCount} 节点）`,
                      "success",
                    );
                  }
                }}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs
                  flex items-center gap-2 transition-all ${
                    isActive ? "glass-active" : "hover:bg-white/25 dark:hover:bg-white/5"
                  }`}
              >
                <span className="flex-1 truncate">{p.name}</span>
                <span className="opacity-50 font-mono shrink-0">{p.nodeCount}</span>
                {isActive && <Check size={12} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
