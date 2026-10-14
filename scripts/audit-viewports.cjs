/**
 * 多视口几何审计。
 *
 * 为什么要专门做这个：WinUI 的 NavigationView 是**自适应**的，
 * 官方文档给了两个断点：
 *   ExpandedModeThresholdWidth = 1008px
 *   CompactModeThresholdWidth  = 640px
 * 只在 1440px 下量一遍，看不出窄屏下的塌陷。
 *
 * 用法：node scripts/audit-viewports.cjs [路径]
 */
const { spawn } = require("node:child_process");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const net = require("node:net");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const ROUTE = process.argv[2] || "/";
const PORT = 0;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".xml": "application/xml",
  ".woff2": "font/woff2",
  ".webp": "image/webp",
};

/** 起一个只服务 dist 的静态服务器（不用 python -m http.server：它可能撞到别人占用的端口） */
function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split("?")[0]);
      let file = path.join(DIST, p);
      if (p.endsWith("/")) file = path.join(file, "index.html");
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        const alt = file.replace(/\/$/, "") + "/index.html";
        file = fs.existsSync(alt) ? alt : path.join(DIST, "404.html");
      }
      if (!fs.existsSync(file)) { res.writeHead(404); res.end("not found"); return; }
      res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

function freePort() {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => resolve(p)); });
  });
}

const VIEWPORTS = [
  { w: 1440, h: 900, label: "桌面（Expanded）" },
  { w: 1100, h: 800, label: "小桌面（Expanded）" },
  { w: 1000, h: 800, label: "断点下沿（应转 Compact）" },
  { w: 900, h: 800, label: "窄（Compact）" },
  { w: 700, h: 800, label: "更窄（Compact 末）" },
  { w: 600, h: 800, label: "断点下沿（应转 Minimal）" },
  { w: 480, h: 800, label: "手机" },
];

const PROBE = `(() => {
  const box = (s) => { const el = document.querySelector(s); if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
             bottom: Math.round(r.bottom), pos: cs.position, ovf: cs.overflowY }; };
  const pane = document.querySelector(".win-nav-left-panel");
  const items = [...document.querySelectorAll(".win-nav-item")].map(e => {
    const r = e.getBoundingClientRect();
    return { t: e.textContent.trim(), x: Math.round(r.x), y: Math.round(r.y),
             vis: r.width > 0 && r.height > 0 && r.bottom <= innerHeight + 2 };
  });
  return JSON.stringify({
    vp: innerWidth + "x" + innerHeight,
    scrollH: document.body.scrollHeight,
    shellReady: document.documentElement.classList.contains("shell-ready"),
    titlebar: box(".win-titlebar"),
    pane: box(".win-nav-left-panel"),
    paneClasses: pane ? pane.className.toString() : null,
    content: box(".win-nav-content"),
    contentInner: box(".win-nav-content-inner"),
    search: box(".win-nav-pane-search"),
    pageHeader: box(".winui-page-header"),
    h1: box("h1"),
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    docScrollW: document.documentElement.scrollWidth,
    items,
  });
})()`;

async function main() {
  const server = await serve();
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}${ROUTE}`;

  const chrome = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  ].find((p) => fs.existsSync(p));
  if (!chrome) { console.error("找不到 Chrome"); process.exit(1); }

  const { spawn: sp } = require("node:child_process");
  const proc = sp(chrome, [
    "--headless=new", "--disable-gpu", "--remote-debugging-port=9333",
    "--no-first-run", "--user-data-dir=" + path.join(ROOT, ".chrome-audit"),
    "about:blank",
  ], { stdio: "ignore" });

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let target = null;
  for (let i = 0; i < 40 && !target; i++) {
    await wait(300);
    try {
      const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
      target = list.find((t) => t.type === "page");
    } catch {}
  }
  if (!target) { console.error("连不上 Chrome CDP"); proc.kill(); server.close(); process.exit(1); }

  const WebSocket = require("ws");
  const ws = new WebSocket(target.webSocketDebuggerUrl, { maxPayload: 64 * 1024 * 1024 });
  await new Promise((r) => ws.on("open", r));
  let id = 0; const pending = new Map();
  ws.on("message", (d) => {
    const m = JSON.parse(d.toString());
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  const send = (method, params = {}) => new Promise((res) => {
    const n = ++id; pending.set(n, res); ws.send(JSON.stringify({ id: n, method, params }));
  });

  await send("Page.enable");
  await send("Runtime.enable");

  console.log(`多视口几何审计：${ROUTE}\n`);
  const rows = [];
  for (const v of VIEWPORTS) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: v.w, height: v.h, deviceScaleFactor: 1, mobile: false,
    });
    await send("Page.navigate", { url });
    await wait(6000);
    const r = await send("Runtime.evaluate", { expression: PROBE, returnByValue: true });
    let d;
    try { d = JSON.parse(r.result.result.value); } catch { console.log(`  ${v.w}px 解析失败`); continue; }
    rows.push({ v, d });

    const compactish = d.paneClasses && /is-compact|is-minimal|is-closed-compact/.test(d.paneClasses);
    console.log(`── ${v.w}×${v.h}  ${v.label}`);
    console.log(`   scrollH=${d.scrollH}  shellReady=${d.shellReady}  横向溢出=${d.horizontalOverflow} (docW=${d.docScrollW})`);
    console.log(`   titlebar=${d.titlebar ? d.titlebar.y + ".." + d.titlebar.bottom : "无"}  pane=${d.pane ? d.pane.x + " w" + d.pane.w + " h" + d.pane.h : "无"}`);
    console.log(`   content=${d.content ? "x" + d.content.x + " w" + d.content.w : "无"}  h1=${d.h1 ? "x" + d.h1.x + " y" + d.h1.y : "无"}`);
    console.log(`   pane 模式=${compactish ? "紧凑/最小" : "展开"}  ${d.paneClasses ? d.paneClasses.slice(0, 60) : ""}`);
    console.log(`   菜单项：` + d.items.map((i) => `${i.t}@x${i.x},y${i.y}${i.vis ? "" : "✗"}`).join("  "));
    console.log("");
  }

  ws.close(); proc.kill(); server.close();
}

main();
