export type ProxyType =
  | "Selector"
  | "URLTest"
  | "Fallback"
  | "Shadowsocks"
  | "Vmess"
  | "Vless"
  | "Trojan"
  | "Hysteria2"
  | "Tuic"
  | "Direct"
  | "Reject";

export interface ProxyNode {
  id: string;
  name: string;
  type: ProxyType;
  server: string;
  delay?: number | null; // ms, null = timeout
  alive: boolean;
  history: number[];
}

export interface ProxyGroup {
  id: string;
  name: string;
  type: Extract<ProxyType, "Selector" | "URLTest" | "Fallback">;
  now: string;
  nodes: ProxyNode[];
  icon?: string;
}

export interface Connection {
  id: string;
  host: string;
  rule: string;
  chain: string;
  network: "tcp" | "udp";
  up: number;
  down: number;
  startAt: number;
}

export interface Rule {
  id: string;
  type: string;
  payload: string;
  proxy: string;
  size: number;
}

export interface LogEntry {
  id: string;
  time: string;
  level: "info" | "warning" | "error" | "debug";
  payload: string;
}

export interface TrafficSample {
  up: number;
  down: number;
}

export interface ClashStatus {
  running: boolean;
  mode: "rule" | "global" | "direct";
  tunEnabled: boolean;
  systemProxy: boolean;
  version: string;
  coreVersion: string;
}

export interface Profile {
  id: string;
  name: string;
  source: "url" | "links" | "demo";
  url?: string;
  nodeCount: number;
  upload: number; // bytes, mirrors the subscription-userinfo header
  download: number;
  total: number; // quota in bytes, 0 = unlimited
  updatedAt: number;
  nodes: ProxyNode[];
}

export type ThemeId = "light" | "dark" | "rhine" | "re";

export interface AppSettings {
  theme: ThemeId;
  glassStrength: number; // 0-100, drives --blur-radius
  specOpacity: number; // 0-100
  liquidSpeed: number; // seconds, lower = faster
  refraction: boolean; // SVG edge refraction on the two main panes
  stress: boolean; // 2000 mock connections to exercise the virtual list
  language: "zh" | "en";
}
