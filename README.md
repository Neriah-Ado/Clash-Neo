# Clash-Neo

以 [clash-verge-rev](https://github.com/clash-verge-rev/clash-verge-rev) 的界面信息架构为蓝本重建的**液态玻璃（Liquid Glass）风格**演示面板。

- 技术栈：Vite + React 19 + TypeScript + Tailwind CSS v4 + Electron（安全加固壳）
- 数据：本地模拟引擎（`src/lib/mock.ts`），全部服务函数按 Tauri `invoke()` 的形状封装，后续可逐个替换为真实内核调用
- 许可：界面灵感来自 GPL-3.0 的 clash-verge-rev，本项目同样以 GPL-3.0 意图发布

## 运行

```bash
npm install
npm run dev            # http://127.0.0.1:5180
npm run build          # 产物在 dist/
npm run electron:dev   # 桌面壳运行
npm run electron:build # 打包 Clash-Neo-1.0.0.exe（release/）
```

## 页面

| 页面 | 内容 |
| --- | --- |
| 首页 | 实时流量 SVG 曲线、核心状态、统计卡片 |
| 代理 | 代理组侧栏、节点网格、延迟测速、手动选择 |
| 连接 | 活动连接表、实时速率、搜索过滤 |
| 规则 | 规则列表与搜索 |
| 日志 | 实时日志流、级别过滤、自动滚动 |
| 设置 | 深色模式、**磨砂强度 / 高光锐度 / 流动速度**三个材质滑杆（实时写 CSS 变量）、系统开关 |

## 液态玻璃材质系统

核心在 `src/styles.css` 与 `public/glass.css`：

- `.liquid-wallpaper`：固定壁纸层，四团彩色径向渐变 + 两个 conic 高光以 `soft-light` 混合模式缓慢漂移
- `.glass`：tint + `backdrop-filter: blur() saturate()` + 内描边 + 顶部镜面高光（`::before` 用 mask 挖出 1px 斜向渐变边）
- `.glass-refract`：SVG `feTurbulence + feDisplacementMap` 边缘折射（设置页可开关，仅 Chromium）
- `.glass-interactive`：悬停时整块玻璃"浮起"，按压时回缩，模拟湿玻璃的手感
- 所有材质参数暴露为 CSS 变量（`--blur-radius`、`--spec-opacity`、`--liquid-speed`），设置页滑杆直接驱动

> **为什么 glass.css 在 public/ 里**：Tailwind v4 的 Lightning CSS 会把无前缀 `backdrop-filter` 降级成 `-webkit-backdrop-filter`（现代 Chromium 已移除该别名），并直接丢弃 `backdrop-filter: url(#filter) blur()` 组合值。这两个规则必须绕过优化器，由浏览器原生解析。

---

## 内核选型调研（GitHub 对照结论）

对照 [核心选型对比](https://core-tutorial.argsment.com/compare) 与 [sing-box vs mihomo 分析](https://www.airlane.cloud/en/blog/singbox-vs-clash-mihomo)：

| 内核 | 定位 | 结论 |
| --- | --- | --- |
| **mihomo**（当前目标内核） | 兼容生态王者：Clash YAML 配置、规则路由、面板 API 生态（本 UI 模拟的正是 RESTful + WebSocket 面板 API） | **保留**。本项目服务层按 Clash API 形状封装，接入即用 |
| [sing-box](https://github.com/SagerNet/sing-box) | 新协议首发（Hysteria2/TUIC/Reality），JSON 配置 | 作为可选后端记录在案；面板 API 不同，需适配层 |
| [clash-rs](https://github.com/Watfaq/clash-rs) | Rust 实现、低资源占用 | 协议覆盖与生态尚有差距，暂不采用 |

结论：V1.0.0 以 mihomo 为目标内核不变；服务层为核心无关设计（`invoke()` 形状），更换内核只需替换适配层。

## 多订阅快速切换（V1.1.0）

- 侧栏常驻**当前订阅切换器**：任意页面一键展开全部订阅（名称 + 节点数 + 当前标记），单击即换
- 切换即时生效：代理组、延迟监控、连接链路全部随新订阅重建，toast 明确反馈
- 订阅页保留完整管理（导入/更新/删除/启用），侧栏是高频路径

## 安全加固清单（V1.0.0 / V1.1.0 强化）

- **CSP**：生产 HTML 携带严格 Content-Security-Policy（`script-src 'self'`、`object-src 'none'`、`base-uri 'none'`、`form-action 'none'`、`referrer: no-referrer`），杜绝注入脚本与远程代码；dev 由 vite 钩子按需放宽（HMR）
- **Electron 壳加固**：`contextIsolation + sandbox` 开启、`nodeIntegration` 关闭、`devTools` 关闭；禁止一切页内导航与 `window.open`，外链一律移交系统浏览器
- **供应链**：`npm audit` 0 漏洞；无 postinstall 依赖钩子（esbuild/electron 安装脚本经 allowScripts 显式批准）
- **输入面**：订阅 URL 解析基于 `new URL()` 校验协议白名单；分享链接按 scheme 白名单过滤；React 默认转义，无 `dangerouslySetInnerHTML`
- **数据面**：演示项目零网络请求；V1.1.0 起双重强制——CSP `connect-src 'none'` + Electron 网络断路开关（渲染层只允许 `file://`，其余请求一律取消），订阅拉取的职责永远属于核心服务而非面板
- **权限面**：拒绝全部 Electron 权限请求（摄像头/麦克风/通知/定位…）；应用菜单移除、单实例锁、`webviewTag`/`experimentalFeatures`/混合内容显式关闭
- **接真实后端时**：建议沿用 Tauri/Electron 侧代理转发订阅请求，避免面板直连任意订阅源

## 主题系统（四套，默认黑曜）

| 主题 | 气质 | 强调色 |
| --- | --- | --- |
| **黑曜**（默认） | 深空蓝黑 + 辉光曲线 | 蓝 `#3b82f6` |
| 浅色 | 晴空玻璃 | 天蓝 |
| **莱茵生命**（明日方舟） | 实验室石墨黑 + 荧光黄绿仪器光 | 荧光黄绿 `#d9f64a` |
| **生化危机** | 近黑血色蔓延 + 生化警示琥珀 | 血红 `#ef4444` / 琥珀 `#f59e0b` |

实现：`<html data-theme="rhine|re">` + CSS 变量分层。每套主题完整迁移**全部**材质层：壁纸四团辉光渐变、玻璃 tint/描边、选中态（`.glass-active`）、滑杆填充、焦点环、键盘 ring、图表双色曲线与渐变、速度数字颜色——组件里不再有任何写死的主题色。顺带修正：显式声明 Tailwind v4 的 `@custom-variant dark`（默认跟随系统而非类名，会导致 `dark:` 工具类在切换时失效）。设置页提供带迷你预览的主题卡片选择器。

## 功能：订阅导入与同地区自动切换

### 订阅导入（参考 clash-verge-rev 的 Profiles 设计）

- **URL 导入**：校验 `http(s)://` 完整性后模拟拉取/解析，展示节点数、更新时间、来源
- **剪贴板分享链接**：解析 `ss:// vmess:// vless:// trojan:// hysteria2:// tuic://` 等 scheme
- **流量条**：按机场订阅通用的 `subscription-userinfo` 惯例展示 已用/总量
- 每张订阅卡支持 **启用 / 更新 / 删除**；启用后代理页的策略组立即由该订阅的节点重建
- 代理组结构模拟真实配置的策略组段：手动选择、url-test 自动选择、fallback 故障转移、按地区分组的区域选择器

### 同地区自动切换（高延迟防护）

mihomo 的 url-test 在全节点池里选最快，`香港` 选择器可能悄悄漂到美国出口；本项目实现的是**地区守恒**的自动切换：

- 后台监控每 3 秒对节点延迟做抖动/尖刺/掉线模拟
- 当前节点**延迟 > 300ms 或掉线**时，只在**同地区前缀**的存活节点里选最优者切换，出口国家保证不漂移
- 切换通过右下角 toast 明确告知（`香港 02 → 香港 05（482 → 96ms）`），手动选择仍然随时可用
- `⚡ 自动选择`（url-test）组保持全局最优语义，与手动组行为区分

---

## 规避同类项目的已知缺陷（第二轮优化）

本轮对照了各代理仪表盘在 GitHub 上的公开缺陷报告，逐条针对性加固：

| 已知缺陷 | 本项目的对策 |
| --- | --- |
| [metacubexd#1277](https://github.com/MetaCubeX/metacubexd/issues/1277)：连接超过 3000 条后连接页卡死、内存涨满，只能重开标签页 | 连接页与日志页改用手写**固定行高虚拟滚动**（`src/components/virtual-list.tsx`）：无论多少条连接，DOM 里只有可视窗口 + 8 行 overscan。实测 2000 条连接仅渲染 23 行、全页 429 个 DOM 节点，DOM 规模与连接总数无关 |
| [metacubexd#1987](https://github.com/MetaCubeX/metacubexd/issues/1987)：连接页实时刷新是最大 CPU 来源 | 行组件 `memo` + 稳定 id key（字节计数变化只重渲染对应行），滚动监听 passive + rAF 合帧，行容器 `contain: layout style paint` 限制重排范围 |
| [sing-box#565](https://github.com/SagerNet/sing-box/issues/565)：面板流量统计与实际用量不一致 | 首页汇总与连接表**派生自同一个连接快照**（`mock.ts` 的单一连接存储），不存在两份各自累加的数据源 |
| 连接 id 不稳定导致的整表闪烁（多仪表盘通病） | 连接在存储中以稳定 id 持久存在，每个 tick 只推进字节计数并做少量增删 |
| 字节计数溢出：累计流量无界增长，浮点超过 2^53 后丢精度显示垃圾值 | `fmtBytes` 对 NaN/Infinity/超 `MAX_SAFE_INTEGER` 显式防护 |
| 日志无限累积导致长会话内存膨胀 | 日志用 512 条环形缓冲 + 虚拟滚动，DOM 恒定 |
| 触屏设备点击触发无意义的悬停浮起动画 | 悬停效果全部包进 `@media (hover: hover)` |
| 进入数据页首屏空白 | 轮询 hook 挂载即执行首次采样（`usePausableInterval`） |

设置页新增**高负载压测**开关（2000 条模拟连接），可随时复现上表的验证场景。

## 参考项目与优化说明

构建时共同参考了这些同类项目：

- [nikdelvin/liquid-glass](https://github.com/nikdelvin/liquid-glass) — iOS 26 Liquid Glass 的纯 CSS + SVG 复刻，`feDisplacementMap` 折射 + `feColorMatrix` 色差。本项目的边缘折射滤镜与"折射开关"由此而来（Safari 不支持 `backdrop-filter: url()`，自动回退为普通磨砂）。
- [Zephyruso/zashboard](https://github.com/Zephyruso/zashboard) / [MetaCubeX/metacubexd](https://github.com/MetaCubeX/metacubexd) — Clash/mihomo 系仪表盘。借鉴其列表渲染优化思路（行级 memo、避免整树重渲染）与平滑数据流呈现。
- [Josh Comeau: backdrop-filter 深入](https://www.joshwcomeau.com/css/backdrop-filter)、[OpenReplay 玻璃拟态指南](https://blog.openreplay.com/create-glassmorphic-ui-css)、[UXPilot 玻璃拟态实践](https://uxpilot.ai/blogs/glassmorphism-ui) — 性能依据：每视口只保留少量真实 `backdrop-filter` 层、绝不动画面积本身、`will-change` 克制使用。

### 性能优化清单

| 问题 | 处理 |
| --- | --- |
| 几十个小元素各带一层 `backdrop-filter`（节点卡、连接行、徽章） | 拆分材质层级：只有侧栏 + 主面板两块大面用真实磨砂，小元素用 `.glass-soft`（tint + 内描边，零采样成本），视觉不变 |
| 流量曲线每秒整树重渲染 | 图表自带 rAF 循环，数据点向目标值缓动插值，路径直接写 DOM（`setAttribute`），每秒只更新一次 React 状态之外的部分 |
| 后台标签页白白耗电 | 所有定时器/动画通过 `usePausableInterval` 与 `document.hidden` 检查暂停，回前台立即补一次采样 |
| 鼠标高光导致频繁样式重算 | `useCursorGlow` 用 passive `pointermove` + rAF 节流，只写两个 CSS 变量，高光层只合成 opacity |
| 列表滚动/切换卡顿 | 行组件 `React.memo`（连接行、节点卡、延迟徽章），规则/连接过滤 `useMemo` |
| 低端机/无障碍 | `prefers-reduced-motion: reduce` 时停掉壁纸漂移、入场动画与光标高光 |

### 动画升级清单

- **平滑曲线**：1 秒采样 + rAF 缓动插值，折线读起来是流动的而不是跳变的；曲线下加 `feGaussianBlur` 辉光
- **入场瀑布**：页面切换与节点网格按 `:nth-child` 阶梯延迟浮入（带轻微过冲的弹簧曲线）
- **数字滚动**：统计卡数值用 rAF 三次缓出插值滚动到位
- **光标追光**：玻璃卡上一枚跟随鼠标的镜面光斑，hover 淡入
- **边缘折射**：主面板对背后壁纸做位移扭曲，最接近真实玻璃的观感（实验开关）

---

## 源项目安全审查报告

审查对象：`clash-verge-rev` dev 分支（v2.5.9，浅克隆于 2026-10-24，本地留存于 `H:\Vibe coding\.audit-clash-verge-rev`）。

**结论：未发现恶意代码。** 逐项依据：

1. **Rust 后端（src-tauri + crates）**
   - 全部进程调用均为正当功能：Linux `systemctl`、Windows 服务安装/卸载的 UAC 提权（`RunasCommand`）、UWP 回环豁免工具，未发现隐藏命令执行、编码载荷或反向 shell。
   - 代码中硬编码 URL 全部可归因：流媒体解锁检测（Netflix/Disney+/TikTok/Spotify/Bilibili 等，来自 `clash-verge-media-unlock` crate）、mihomo 内核版本检查（MetaCubeX 官方 GitHub）、本地 `127.0.0.1` API。
   - **无遥测/数据上报代码**（grep telemetry/analytics/collect 为零命中）。
   - 用户配置的 profile 脚本在 **Boa 纯 Rust JS 引擎**中执行：无宿主 API 暴露、5 秒超时、1000 万次循环上限、输出 1MB 上限，沙箱化设计良好（`src-tauri/src/enhance/script.rs`）。

2. **前端（src/）**：无 `eval` / `new Function` / `document.write` / `dangerouslySetInnerHTML`；仅有的 `atob` 用于解析分享链接的 base64，属正常功能。

3. **更新链路**：Tauri 更新器内置 minisign 公钥（`tauri.conf.json`），中国区加速镜像 `update.hwdns.net` / `gh-proxy.org` 仅做下载加速，**签名校验仍然生效**，镜像被劫持也无法安装伪造更新。

4. **构建脚本（scripts/）**：mihomo 内核与 GeoIP 数据从 MetaCubeX 官方 Release 拉取，服务组件来自项目自己的 `clash-verge-service-ipc` 仓库，无 postinstall 钩子，无 `curl | bash`。

5. **CI（.github/workflows）**：无 `curl | sh`，但 `dtolnay/rust-toolchain@master`、`vedantmgoyal9/winget-releaser@main` 未按 commit SHA 固定——属供应链卫生问题而非恶意行为。

遗留提示（非恶意、值得知晓）：

- `capabilities/*.json` 授予了 `http: *` 与较宽的 `fs` scope——这是代理客户端订阅管理的必然需求，但意味着前端一旦被注入任意代码权限很大。
- 更新/内核/服务下载 URL 未在构建脚本内做 SHA 固定，依赖 GitHub Release 的完整性与 Tauri 签名校验兜底。
