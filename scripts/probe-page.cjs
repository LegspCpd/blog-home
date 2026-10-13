/**
 * 通用探针：起 chrome + 静态服务器，用 CDP 在**固定视口**下量真实 DOM。
 *
 * 两个必须做对的点，之前都栽过：
 *
 * 1. 视口必须固定且足够宽。NavigationView 在窄视口走 compact/overlay 分支，
 *    组件整体不渲染；用 --window-size 截图得到的"空白"会被误读成组件坏了。
 *    这里统一用 Emulation.setDeviceMetricsOverride。
 *
 * 2. 静态服务器必须自建并**校验内容**。用 python -m http.server 撞到被占用
 *    端口时，请求会落到别的服务上并返回 200，自检通过但页面不是我们的
 *    —— 测出来的空白是假象。这里用 Node 自建、监听临时端口、并断言页面
 *    内容里出现已知标记。
 *
 * 用法：
 *   node scripts/_probe.cjs /navmount/ 1280 900
 *   PROBE_WAIT=60000 node scripts/_probe.cjs http://127.0.0.1:5199/app/ 1280 900
 */
const { spawn } = require("node:child_process");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ROUTE = process.argv[2] || "/navtest/";
const W = Number(process.argv[3] || 1280);
const H = Number(process.argv[4] || 900);
const WAIT_MS = Number(process.env.PROBE_WAIT || 8000);

const EXTERNAL = /^https?:\/\//.test(ROUTE);

const CDP_PORT = 9400 + (process.pid % 400);
const PROFILE = process.env.TEMP + "\\cdp-probe-" + process.pid;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
};

/** 起一个只服务 dist 的静态服务器，端口由系统分配，返回 {server, port}。 */
function startStaticServer() {
  return new Promise((resolve, reject) => {
    const root = path.resolve(process.cwd(), "dist");
    const server = http.createServer((req, res) => {
      let rel = decodeURIComponent(req.url.split("?")[0]);
      if (rel.endsWith("/")) rel += "index.html";
      const full = path.join(root, rel);
      if (!full.startsWith(root)) {
        res.writeHead(403).end("forbidden");
        return;
      }
      fs.readFile(full, (err, buf) => {
        if (err) {
          res.writeHead(404, { "content-type": "text/plain" }).end("not found");
          return;
        }
        res.writeHead(200, { "content-type": MIME[path.extname(full)] || "application/octet-stream" });
        res.end(buf);
      });
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

/** chrome 的调用方式要跟着平台走，参数里的 --headless=new 在 Windows 上不要加引号。 */
function launchChrome() {
  return spawn(
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    [
      "--headless=new",
      `--remote-debugging-port=${CDP_PORT}`,
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${PROFILE}`,
      "about:blank",
    ],
    { stdio: "ignore" }
  );
}

(async () => {
  const ch = launchChrome();

  let up = false;
  for (let i = 0; i < 80; i++) {
    try {
      await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      up = true;
      break;
    } catch {
      await sleep(250);
    }
  }
  if (!up) {
    console.log("FATAL: chrome 调试端口未就绪");
    process.exit(1);
  }

  let server = null;
  let TARGET_URL;
  if (EXTERNAL) {
    TARGET_URL = ROUTE;
  } else {
    const started = await startStaticServer();
    server = started.server;
    TARGET_URL = `http://127.0.0.1:${started.port}${ROUTE}`;

    // 自检：确认返回的确实是我们的页面，而不是恰好占了这个端口的别的服务。
    let html = "";
    for (let i = 0; i < 20; i++) {
      try {
        const res = await fetch(TARGET_URL);
        html = res.ok ? await res.text() : "";
        if (html) break;
      } catch {
        /* 还在起 */
      }
      await sleep(200);
    }
    if (!html.includes("astro-island") && !html.includes("<html")) {
      console.log(`FATAL: 静态服务器内容异常，拿到的不是本站页面 (${TARGET_URL})`);
      console.log("  首 200 字节: " + JSON.stringify(html.slice(0, 200)));
      server.close();
      ch.kill();
      process.exit(1);
    }
  }

  const target = await fetch(
    `http://127.0.0.1:${CDP_PORT}/json/new?${encodeURI(TARGET_URL)}`,
    { method: "PUT" }
  ).then((r) => r.json());

  const WS = require(path.join(process.cwd(), "node_modules", "ws"));
  const ws = new WS(target.webSocketDebuggerUrl);
  let id = 0;
  const pend = new Map();
  const evs = [];
  ws.on("message", (raw) => {
    const m = JSON.parse(raw.toString());
    if (m.id && pend.has(m.id)) {
      pend.get(m.id)(m);
      pend.delete(m.id);
    } else if (m.method) evs.push(m);
  });
  const send = (method, params = {}) =>
    new Promise((r) => {
      const i = ++id;
      pend.set(i, r);
      ws.send(JSON.stringify({ id: i, method, params }));
    });

  await new Promise((r) => ws.on("open", r));
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: W,
    height: H,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url: TARGET_URL });
  await sleep(WAIT_MS);

  const expr = `(() => {
    const q = (s) => document.querySelectorAll(s).length;
    const island = document.querySelector('astro-island');
    const text = (s) => [...document.querySelectorAll(s)].map(e => e.textContent.trim()).slice(0, 6);
    // WinUIonWeb 的 theme.css 在 :root 上定义了 Fluent 令牌；
    // 读出来才能确认站点的设计系统能不能直接吃这些值。
    const cs = getComputedStyle(document.documentElement);
    const tok = (n) => cs.getPropertyValue(n).trim();
    return JSON.stringify({
      href: location.href,
      viewport: innerWidth + 'x' + innerHeight,
      islandCount: q('astro-island'),
      islandInnerLen: island ? island.innerHTML.length : -1,
      rootChildLen: (document.getElementById('winui-root') || {}).innerHTML?.length ?? -1,
      shell: q('.win-nav-shell'),
      menuHost: q('[data-template-part="MenuItemsHost"]'),
      navMenu: q('.win-nav-menu'),
      navItem: q('.win-nav-item'),
      navItemText: text('.win-nav-item'),
      buttons: q('button'),
      h1: text('h1'),
      // WinUI 应用壳的结构特征：标题栏 / 窗格标题 / 52px 页头 / 搜索框 / 选中条
      winui: {
        titleBar: q('[class*="titlebar" i]'),
        captionButtons: q('[class*="caption" i]'),
        navShell: q('.win-nav-shell'),
        paneTitle: (document.querySelector('[class*="pane-title" i]') || {}).textContent?.trim() ?? null,
        // 上游的实际 class 是 win-nav-page-header（52px 的那条）
        header: (document.querySelector('.win-nav-page-header, [class*="page-header" i]') || {}).textContent?.trim() ?? null,
        headerHeight: (() => { const el = document.querySelector('.win-nav-page-header'); return el ? Math.round(el.getBoundingClientRect().height) : -1; })(),
        paneTitleHeight: (() => { const el = document.querySelector('.win-nav-top-pane-title'); return el ? Math.round(el.getBoundingClientRect().height) : -1; })(),
        autoSuggest: q('[class*="auto-suggest" i], [class*="autosuggest" i]'),
        selectionIndicator: q('.win-nav-indicator'),
        indicatorTrack: q('.win-nav-indicator-track'),
        topLevelClasses: [...document.body.children].map(e => e.tagName.toLowerCase() + '.' + (e.className || '').toString().split(' ').filter(Boolean).slice(0,3).join('.')).slice(0, 6),
        searchBg: (() => {
          const el = document.querySelector('[class*="auto-suggest" i] input, [class*="autosuggest" i] input, input[placeholder]');
          if (!el) return null;
          const cs = getComputedStyle(el);
          const box = el.closest('[class*="text-box" i], [class*="textbox" i]') || el;
          const bcs = getComputedStyle(box);
          return { inputBg: cs.backgroundColor, boxBg: bcs.backgroundColor, boxBorder: bcs.borderBottomColor, color: cs.color };
        })(),
        titleBarHtmlLen: (document.querySelector('[class*="titlebar" i]') || {}).innerHTML?.length ?? -1,
      },
      fluent: {
        appBg: tok('--app-bg'),
        cardBg: tok('--card-bg'),
        cardStroke: tok('--card-stroke'),
        textPrimary: tok('--text-primary'),
        textSecondary: tok('--text-secondary'),
        accent: tok('--accent-base'),
        themeClass: document.documentElement.className,
        bodyFont: getComputedStyle(document.body).fontFamily.slice(0, 80),
      },
    }, null, 1);
  })()`;

  const r = await send("Runtime.evaluate", {
    returnByValue: true,
    awaitPromise: true,
    expression: expr,
  });
  console.log("=== DOM ===");
  console.log(r.result?.result?.value ?? JSON.stringify(r.result?.exceptionDetails));

  const errs = [];
  for (const e of evs) {
    if (e.method === "Runtime.consoleAPICalled" && e.params.type === "error") {
      errs.push("[console] " + e.params.args.map((a) => a.value ?? a.description).join(" ").slice(0, 900));
    }
    if (e.method === "Log.entryAdded" && e.params.entry.level === "error") {
      errs.push("[log] " + String(e.params.entry.text).slice(0, 900));
    }
    if (e.method === "Runtime.exceptionThrown") {
      const d = e.params.exceptionDetails;
      errs.push("[exc] " + (d.exception?.description || d.text).slice(0, 900));
    }
  }
  if (errs.length) {
    console.log("=== 错误 ===");
    for (const e of [...new Set(errs)]) console.log(e);
  }

  // 需要看观感时设 PROBE_SHOT=<输出 png 路径>
  const shot = process.env.PROBE_SHOT;
  if (shot) {
    // PROBE_CLIP=<高度> 时只截顶部那一块 ——
    // 整页截图非常长，标题栏与 52px 页头的细节会被压缩到看不清。
    const clipH = Number(process.env.PROBE_CLIP || 0);
    const params = { format: "png", captureBeyondViewport: !clipH };
    if (clipH) params.clip = { x: 0, y: 0, width: W, height: clipH, scale: 1 };
    const cap = await send("Page.captureScreenshot", params);
    if (cap.result?.data) {
      fs.writeFileSync(shot, Buffer.from(cap.result.data, "base64"));
      console.log("=== 截图 ===\n  " + shot);
    } else {
      console.log("截图失败: " + JSON.stringify(cap.error ?? cap));
    }
  }

  ws.close();
  if (server) server.close();
  ch.kill();
  process.exit(0);
})();
