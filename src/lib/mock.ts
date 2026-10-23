import type {
  ClashStatus,
  ProxyType,
  Connection,
  LogEntry,
  ProxyGroup,
  ProxyNode,
  Rule,
  TrafficSample,
  Profile,
} from "../types";

/**
 * Mock data engine. Every exported function is async and shaped like a
 * Tauri `invoke("cmd")` call, so a real backend can replace the body
 * one command at a time without touching the views.
 */

const rnd = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const REGIONS: Array<[string, string, ProxyNode["type"]]> = [
  ["香港", "hk-01.leafnode.net", "Shadowsocks"],
  ["香港", "hk-02.leafnode.net", "Shadowsocks"],
  ["台湾", "tw-01.leafnode.net", "Hysteria2"],
  ["日本", "jp-01.leafnode.net", "Vmess"],
  ["日本", "jp-02.leafnode.net", "Vless"],
  ["新加坡", "sg-01.leafnode.net", "Trojan"],
  ["新加坡", "sg-02.leafnode.net", "Hysteria2"],
  ["美国", "us-01.leafnode.net", "Trojan"],
  ["美国", "us-02.leafnode.net", "Tuic"],
  ["韩国", "kr-01.leafnode.net", "Vmess"],
  ["英国", "uk-01.leafnode.net", "Trojan"],
  ["德国", "de-01.leafnode.net", "Vless"],
];

function makeNodes(prefix: string, count: number): ProxyNode[] {
  return Array.from({ length: count }, (_, i) => {
    const [region, server, type] = REGIONS[(i + count) % REGIONS.length];
    const delay = Math.random() < 0.92 ? Math.round(rnd(35, 420)) : null;
    return {
      id: `${prefix}-${i}`,
      name: `${region} ${String(i + 1).padStart(2, "0")} · ${type}`,
      type,
      server: `${server}:${Math.round(rnd(1000, 65535))}`,
      delay,
      alive: delay !== null,
      history: Array.from({ length: 20 }, () =>
        delay ? Math.round(delay * rnd(0.8, 1.25)) : 0,
      ),
    };
  });
}

/** Region prefix of a node name, e.g. "香港 01 · Trojan" → "香港". */
export function regionOf(nodeName: string): string {
  return nodeName.split(" ")[0] ?? nodeName;
}

/**
 * Build the policy groups shown on the proxies page from a node pool.
 * Mirrors what a real profile's policy-group section does: a manual
 * selector, a url-test auto group, a fallback group, and one per-region
 * selector so the regional failover monitor has something to target.
 */
export function makeGroups(nodes?: ProxyNode[]): ProxyGroup[] {
  const pool = nodes ?? makeNodes("main", 14);
  const best = pool.filter((n) => n.alive).sort((a, b) => a.delay! - b.delay!)[0];

  const byRegion = new Map<string, ProxyNode[]>();
  for (const n of pool) {
    const region = regionOf(n.name);
    byRegion.set(region, [...(byRegion.get(region) ?? []), n]);
  }
  const regionGroups: ProxyGroup[] = [...byRegion.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 4)
    .map(([region, regionNodes], i) => ({
      id: `g-region-${i}`,
      name: `🌐 ${region}`,
      type: "Selector" as const,
      now: best && regionNodes.includes(best) ? best.name : regionNodes[0].name,
      nodes: regionNodes,
    }));

  return [
    { id: "g-main", name: "🚀 节点选择", type: "Selector", now: best?.name ?? pool[0].name, nodes: pool },
    { id: "g-auto", name: "⚡ 自动选择", type: "URLTest", now: best?.name ?? pool[0].name, nodes: pool },
    { id: "g-fb", name: "🛑 故障转移", type: "Fallback", now: pool[0].name, nodes: pool.slice(0, 8) },
    ...regionGroups,
    { id: "g-final", name: "🐟 漏网之鱼", type: "Selector", now: pool[0].name, nodes: pool.slice(0, 6) },
  ];
}

const HOSTS = [
  "www.netflix.com", "api.openai.com", "www.youtube.com", "chat.z.ai",
  "github.com", "registry.npmjs.org", "fonts.gstatic.com", "www.bilibili.com",
  "claude.ai", "api.telegram.org", "store.steampowered.com", "cdn.jsdelivr.net",
  "www.google.com", "discord.com", "x.com", "object-storage.example.net",
];

const RULE_SAMPLES: Array<[string, string, string]> = [
  ["DomainSuffix", "openai.com", "🤖 AI 服务"],
  ["DomainSuffix", "netflix.com", "📺 流媒体"],
  ["DomainKeyword", "youtube", "📺 流媒体"],
  ["IP-CIDR", "91.108.4.0/22", "🚀 节点选择"],
  ["DomainSuffix", "bilibili.com", "DIRECT"],
  ["GeoIP", "CN", "DIRECT"],
  ["DomainSuffix", "telegram.org", "🚀 节点选择"],
  ["DomainSuffix", "steamcontent.com", "DIRECT"],
  ["Match", "", "🐟 漏网之鱼"],
];

export function makeRules(): Rule[] {
  return RULE_SAMPLES.map(([type, payload, proxy], i) => ({
    id: `r-${i}`,
    type,
    payload,
    proxy,
    size: i === RULE_SAMPLES.length - 1 ? 3 : Math.round(rnd(1, 99)),
  }));
}

let connSeq = 0;
const connStore = new Map<string, Connection>();

function newConnection(): Connection {
  const host = pick(HOSTS);
  connSeq += 1;
  return {
    id: `c-${connSeq}`,
    host,
    rule: `DomainSuffix ${host.split(".").slice(-2).join(".")}`,
    chain: pick(["🚀 节点选择 | 香港 01", "🚀 节点选择 | 美国 02", "DIRECT", "📺 流媒体 | 日本 01"]),
    network: Math.random() < 0.8 ? "tcp" : "udp",
    up: Math.round(rnd(2e4, 3e6)),
    down: Math.round(rnd(2e4, 8e7)),
    startAt: Date.now() - Math.round(rnd(3, 600)) * 1000,
  };
}

/**
 * Mutable load profile: the stress toggle raises the target so the
 * virtualized connections page can be validated at metacubexd#1277 scale
 * (3000+ rows) without touching any view code.
 */
export const loadProfile = { targetConnections: 9 };

/**
 * Stable-identity snapshot: connections persist between ticks with their
 * ids intact and only their byte counters advance. Unstable keys re-mount
 * rows every update (the flicker defect), while recomputing totals from a
 * different snapshot than the table (the sing-box#565 stats-mismatch
 * defect) is avoided by deriving everything from this one store.
 */
export async function fetchConnections(): Promise<Connection[]> {
  const target = loadProfile.targetConnections;

  while (connStore.size < target) {
    const c = newConnection();
    connStore.set(c.id, c);
  }
  if (connStore.size > target) {
    const excess = connStore.size - target;
    const keys = [...connStore.keys()];
    for (let i = 0; i < excess; i++) {
      connStore.delete(keys.splice(Math.floor(Math.random() * keys.length), 1)[0]);
    }
  }
  // small organic churn: occasionally close one and open one
  if (connStore.size > 2 && Math.random() < 0.2) {
    const keys = [...connStore.keys()];
    connStore.delete(keys[Math.floor(Math.random() * keys.length)]);
    const c = newConnection();
    connStore.set(c.id, c);
  }

  for (const c of connStore.values()) {
    c.up = Math.round(c.up * rnd(1.0, 1.004));
    c.down = Math.round(c.down * rnd(1.0001, 1.008));
    c.startAt = c.startAt || Date.now();
  }
  return [...connStore.values()];
}

export async function fetchLogs(): Promise<LogEntry[]> {
  const templates: Array<[LogEntry["level"], string]> = [
    ["info", "start initial provider success"],
    ["info", "DNS: resolve example.net via doh.pub success"],
    ["debug", "[TCP] match DomainSuffix using 🚀 节点选择[香港 01]"],
    ["info", "Health check: 香港 01 → 88ms"],
    ["warning", "connect error: 日本 02 timeout after 5000ms"],
    ["debug", "[UDP] match GeoIP(CN) using DIRECT"],
    ["error", "proxy loopback detected, connection rejected"],
    ["info", "restored provider meta-rules-dat: 127 rules"],
  ];
  return Array.from({ length: 18 }, (_, i) => {
    const [level, payload] = pick(templates);
    const d = new Date();
    return {
      id: `l-${Date.now()}-${i}`,
      time: d.toTimeString().slice(0, 8),
      level,
      payload,
    };
  });
}

export function makeTrafficHistory(n = 60): TrafficSample[] {
  return Array.from({ length: n }, () => ({
    up: Math.round(rnd(2e3, 3e5)),
    down: Math.round(rnd(5e4, 2.5e6)),
  }));
}

export function nextTraffic(prev: TrafficSample): TrafficSample {
  const trend = rnd(-0.3, 0.45);
  return {
    up: Math.max(500, Math.round(prev.up * (1 + trend * 0.4) + rnd(-2e4, 4e4))),
    down: Math.max(2e4, Math.round(prev.down * (1 + trend * 0.25) + rnd(-1.5e5, 3e5))),
  };
}

export async function fetchStatus(): Promise<ClashStatus> {
  return {
    running: true,
    mode: "rule",
    tunEnabled: false,
    systemProxy: true,
    version: "1.0.0-neo",
    coreVersion: "mihomo 1.19.13",
  };
}

export function latencyTest(): Promise<Map<string, number | null>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const result = new Map<string, number | null>();
      for (let i = 0; i < 20; i++) {
        result.set(`node-${i}`, Math.random() < 0.1 ? null : Math.round(rnd(30, 460)));
      }
      resolve(result);
    }, 700);
  });
}

export function fmtBytes(n: number): string {
  // Dashboards have shipped NaN/garbage for overflowing byte counters
  // (totals only ever grow; a float loses integer precision past 2^53).
  if (!Number.isFinite(n)) return "—";
  if (n > Number.MAX_SAFE_INTEGER) return "大量数据";
  if (n < 1024) return `${Math.round(n)} B`;
  const units = ["KB", "MB", "GB", "TB", "PB"];
  let v = n;
  let i = -1;
  do {
    v /= 1024;
    i++;
  } while (v >= 1024 && i < units.length - 1);
  return `${v.toFixed(1)} ${units[i]}`;
}

export function fmtSpeed(n: number): string {
  return `${fmtBytes(n)}/s`;
}

/* ------------------------------------------------------------------ */
/* Subscriptions (Profiles)                                            */
/* ------------------------------------------------------------------ */


export const PROFILE_ACTIVATED = "cvr-glass:profile-activated";

const GB = 1024 ** 3;

let profileSeq = 0;
let profiles: Profile[] = [];
let activeProfileId: string | null = null;

const schemeType: Record<string, ProxyType> = {
  ss: "Shadowsocks",
  ssr: "Shadowsocks",
  vmess: "Vmess",
  vless: "Vless",
  trojan: "Trojan",
  hysteria: "Hysteria2",
  hysteria2: "Hysteria2",
  tuic: "Tuic",
};

function generateProfileNodes(seed: string, count: number): ProxyNode[] {
  // seed only varies the mix so re-importing feels deterministic
  const offset = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: count }, (_, i) => {
    const [region, server, type] = REGIONS[(i * 3 + offset) % REGIONS.length];
    const delay = Math.random() < 0.94 ? Math.round(rnd(40, 460)) : null;
    return {
      id: `p${profileSeq}-n${i}`,
      name: `${region} ${String(i + 1).padStart(2, "0")} · ${type}`,
      type,
      server: `${server}:${Math.round(rnd(1000, 65535))}`,
      delay,
      alive: delay !== null,
      history: Array.from({ length: 20 }, () =>
        delay ? Math.round(delay * rnd(0.85, 1.2)) : 0,
      ),
    };
  });
}

function makeProfile(
  name: string,
  source: Profile["source"],
  url: string | undefined,
  nodeCount: number,
): Profile {
  profileSeq += 1;
  return {
    id: `profile-${profileSeq}`,
    name,
    source,
    url,
    nodeCount,
    // convention from the subscription-userinfo response header that all
    // clash clients display: upload / download / total
    upload: Math.round(rnd(1, 20) * GB),
    download: Math.round(rnd(5, 70) * GB),
    total: pick([100, 200, 300, 500, 1024]) * GB,
    updatedAt: Date.now(),
    nodes: generateProfileNodes(name + profileSeq, nodeCount),
  };
}

// one demo subscription so the app is never empty on first run
{
  const demo = makeProfile("演示机场 · GlassNet", "demo", undefined, 16);
  profiles.push(demo);
  activeProfileId = demo.id;
}

export function getProfiles(): Profile[] {
  return profiles;
}

export function getActiveProfile(): Profile | null {
  return profiles.find((p) => p.id === activeProfileId) ?? null;
}

export function activeGroups(): ProxyGroup[] {
  return makeGroups(getActiveProfile()?.nodes);
}

export type ImportInput =
  | { kind: "url"; url: string }
  | { kind: "links"; text: string }
  | { kind: "demo" };

/** Validates like the real clients do, then simulates download + parse. */
export async function importProfile(input: ImportInput): Promise<Profile> {
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 700));

  if (input.kind === "url") {
    let host: string;
    try {
      const parsed = new URL(input.url);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error("bad protocol");
      host = parsed.hostname;
    } catch {
      throw new Error("订阅链接格式不正确，需要 http(s):// 开头的完整 URL");
    }
    const profile = makeProfile(
      host,
      "url",
      input.url,
      Math.round(rnd(8, 24)),
    );
    profiles = [...profiles, profile];
    return profile;
  }

  if (input.kind === "links") {
    const lines = input.text
      .split(/\s+/)
      .filter((l) => /^(ss|ssr|vmess|vless|trojan|hysteria2?|tuic):\/\//i.test(l));
    if (lines.length === 0) {
      throw new Error(
        "未识别到分享链接，支持 ss:// vmess:// vless:// trojan:// hysteria2:// tuic://",
      );
    }
    const profile = makeProfile(`剪贴板导入 · ${lines.length} 节点`, "links", undefined, lines.length);
    profiles = [...profiles, profile];
    return profile;
  }

  const profile = makeProfile(`GlassNet 备用线路 ${profiles.length + 1}`, "demo", undefined, Math.round(rnd(10, 20)));
  profiles = [...profiles, profile];
  return profile;
}

export async function refreshProfile(id: string): Promise<Profile> {
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 600));
  profiles = profiles.map((p) => {
    if (p.id !== id) return p;
    const nodes = generateProfileNodes(p.name + Math.random(), p.nodeCount);
    return {
      ...p,
      updatedAt: Date.now(),
      download: p.download + Math.round(rnd(0.1, 2) * GB),
      nodes,
    };
  });
  const updated = profiles.find((p) => p.id === id)!;
  if (id === activeProfileId) notifyProfileActivated();
  return updated;
}

export function activateProfile(id: string): void {
  if (!profiles.some((p) => p.id === id)) return;
  activeProfileId = id;
  notifyProfileActivated();
}

export function removeProfile(id: string): void {
  profiles = profiles.filter((p) => p.id !== id);
  if (activeProfileId === id) {
    activeProfileId = profiles[0]?.id ?? null;
    notifyProfileActivated();
  }
}

function notifyProfileActivated() {
  window.dispatchEvent(new CustomEvent(PROFILE_ACTIVATED));
}
