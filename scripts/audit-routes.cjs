/**
 * 全站逐路由审计
 *
 * 仓库自带的 a11y / visual 只抽查 5 个页面，盖不住 54 条路由。
 * 这个脚本在**一个浏览器会话**里依次打开每条路由，检查：
 *
 *   1. WinUI 外壳是否渲染（astro-island 内容非空、NavigationView 菜单项数）
 *   2. 正文是否真的在（<main> 存在且文本够长）
 *   3. SEO 三件套（title / meta description / canonical）
 *   4. 是否有控制台异常（过滤掉 favicon 这类无关 404）
 *   5. 可见文本里有没有漏出来的 "undefined" / "NaN" / "[object Object]"
 *
 * 用法：
 *   node scripts/audit-routes.cjs            # 全部路由
 *   node scripts/audit-routes.cjs /archive/  # 只查指定路由
 *
 * 退出码：有 FAIL 时为 1，可直接进 CI。
 */
const { spawn } = require("node:child_process");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DIST = path.resolve(process.cwd(), "dist");
const CDP_PORT = 9800 + (process.pid % 150);
const PROFILE = process.env.TEMP + "\\cdp-audit-" + process.pid;
const VIEWPORT = { width: 1440, height: 900 };
const PER_PAGE_MS = Number(process.env.AUDIT_WAIT || 2600);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".avif": "image/avif",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
};

/** 把 dist 下的 index.html 路径映射成 URL 路由 */
function collectRoutes() {
  const routes = [];
  const walk = (dir, prefix) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "_astro" || entry.name === "fonts" || entry.name === "images") continue;
        walk(full, `${prefix}${entry.name}/`);
      } else if (entry.name === "index.html") {
        routes.push(prefix);
      } else if (entry.name.endsWith(".html")) {
        routes.push(`${prefix}${entry.name}`);
      }
    }
  };
  walk(DIST, "/");
  return [...new Set(routes)].sort();
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let rel = decodeURIComponent(req.url.split("?")[0]);
      if (rel.endsWith("/")) rel += "index.html";
      const full = path.join(DIST, rel);
      if (!full.startsWith(DIST)) return res.writeHead(403).end("forbidden");
      fs.readFile(full, (err, buf) => {
        if (err) return res.writeHead(404, { "content-type": "text/plain" }).end("not found");
        res.writeHead(200, { "content-type": MIME[path.extname(full)] || "application/octet-stream" });
        res.end(buf);
      });
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

(async () => {
  if (!fs.existsSync(DIST)) {
    console.error("找不到 dist/，先跑 pnpm build");
    process.exit(1);
  }

  const all = collectRoutes();
  const only = process.argv.slice(2).filter((a) => a.startsWith("/"));
  const routes = only.length ? all.filter((r) => only.some((o) => r.startsWith(o))) : all;

  const ch = spawn(
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
    console.error("chrome 调试端口未就绪");
    process.exit(1);
  }

  const { server, port } = await startStaticServer();
  const base = `http://127.0.0.1:${port}`;

  const target = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, {
    method: "PUT",
  }).then((r) => r.json());

  const WS = require(path.join(process.cwd(), "node_modules", "ws"));
  const ws = new WS(target.webSocketDebuggerUrl);
  let id = 0;
  const pend = new Map();
  let events = [];
  ws.on("message", (raw) => {
    const m = JSON.parse(raw.toString());
    if (m.id && pend.has(m.id)) {
      pend.get(m.id)(m);
      pend.delete(m.id);
    } else if (m.method) events.push(m);
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
    ...VIEWPORT,
    deviceScaleFactor: 1,
    mobile: false,
  });

  const EXPR = `(() => {
    const q = (s) => document.querySelectorAll(s).length;
    const main = document.querySelector('main');

    // 只在**非代码**文本里找漏出来的占位符。
    // 文章里的示例代码本来就可能出现 undefined / NaN（比如
    // "request.body : undefined"），把它们算成 bug 是误报。
    const clone = document.body ? document.body.cloneNode(true) : null;
    if (clone) clone.querySelectorAll('pre, code, script, style, kbd, samp').forEach(n => n.remove());
    const proseText = clone ? clone.innerText : '';
    const junk = ['undefined', 'NaN', '[object Object]'].filter(t => proseText.includes(t));

    // 站内链接：交给 Node 侧核对是否真有对应产物
    const internal = [...new Set(
      [...document.querySelectorAll('a[href]')]
        .map(a => a.getAttribute('href'))
        .filter(h => h && h.startsWith('/') && !h.startsWith('//'))
        .map(h => h.split('#')[0].split('?')[0])
        .filter(Boolean)
        // 中文标签在 href 里是百分号编码，产物路径是未编码的中文文件名，
        // 不还原就会把一堆正常链接误报成断链。
        .map(h => { try { return decodeURIComponent(h); } catch { return h; } })
    )];

    return JSON.stringify({
      islandLen: (document.querySelector('astro-island')||{}).innerHTML?.length ?? -1,
      navItem: q('.win-nav-item'),
      hasMain: !!main,
      mainLen: main ? main.innerText.trim().length : 0,
      h1: q('h1'),
      title: (document.title || '').length,
      desc: !!document.querySelector('meta[name="description"]'),
      canonical: !!document.querySelector('link[rel="canonical"]'),
      links: q('a[href]'),
      internal,
      imgsMissingAlt: [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).length,
      junk,
    });
  })()`;

  const results = [];
  for (const route of routes) {
    events = [];
    await send("Page.navigate", { url: base + route });
    await sleep(PER_PAGE_MS);

    const r = await send("Runtime.evaluate", { returnByValue: true, expression: EXPR });
    let d;
    try {
      d = JSON.parse(r.result?.result?.value ?? "{}");
    } catch {
      d = {};
    }

    const errs = [];
    for (const e of events) {
      if (e.method === "Runtime.consoleAPICalled" && e.params.type === "error") {
        const txt = e.params.args.map((a) => a.value ?? a.description).join(" ");
        // favicon / 静态资源 404 是噪音，不算功能缺口
        if (/Failed to load resource.*404/.test(txt)) continue;
        errs.push(txt.slice(0, 200));
      }
      if (e.method === "Runtime.exceptionThrown") {
        const dd = e.params.exceptionDetails;
        const txt = dd.exception?.description || dd.text || "";
        if (/Failed to load resource.*404/.test(txt)) continue;
        errs.push(txt.split("\n")[0].slice(0, 200));
      }
    }

    const problems = [];
    if (!(d.islandLen > 0)) problems.push(`外壳未渲染(islandLen=${d.islandLen})`);
    if (!(d.navItem >= 4)) problems.push(`菜单项=${d.navItem}`);
    if (!d.hasMain) problems.push("无 <main>");
    if (d.mainLen < 40) problems.push(`正文过短(${d.mainLen})`);
    if (!(d.h1 >= 1)) problems.push("无 h1");
    if (!d.title) problems.push("无 title");
    if (!d.desc) problems.push("无 meta description");
    if (!d.canonical) problems.push("无 canonical");
    if (d.imgsMissingAlt) problems.push(`${d.imgsMissingAlt} 张图缺 alt`);
    if (d.junk?.length) problems.push(`正文含 ${d.junk.join("/")}`);
    if (errs.length) problems.push(`控制台 ${errs.length} 条: ${errs[0]}`);

    results.push({ route, problems, d });
    const mark = problems.length ? "FAIL" : " ok ";
    console.log(
      `${mark} ${route.padEnd(46)} island=${String(d.islandLen).padStart(6)} nav=${d.navItem} main=${String(d.mainLen).padStart(5)} a=${d.links}`
    );
    if (problems.length) console.log(`       └─ ${problems.join(" | ")}`);
  }

  const failed = results.filter((r) => r.problems.length);

  // ---- 站内链接完整性 ----
  // 断链是"功能用不了"最直接的一种：导航点下去 404。前面每页的渲染检查抓不到它。
  const builtFiles = new Set();
  const walkFiles = (dir, prefix) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walkFiles(full, `${prefix}${entry.name}/`);
      else builtFiles.add(prefix + entry.name);
    }
  };
  walkFiles(DIST, "/");

  const broken = new Map();
  for (const { route, d } of results) {
    for (const href of d.internal ?? []) {
      // 目录式 URL（以 / 结尾）→ 找 index.html；其余按文件名找
      const candidates =
        href.endsWith("/") || href === ""
          ? [`${href}index.html`]
          : [href, `${href}/index.html`, `${href}.html`];
      if (candidates.some((c) => builtFiles.has(c))) continue;
      if (!broken.has(href)) broken.set(href, []);
      broken.get(href).push(route);
    }
  }

  if (broken.size) {
    console.log(`\n=== 断链（${broken.size} 个目标不存在）===`);
    for (const [href, from] of broken) {
      console.log(`  ${href}`);
      console.log(`      出现在: ${from.slice(0, 4).join(", ")}${from.length > 4 ? ` …共 ${from.length} 页` : ""}`);
    }
  } else {
    console.log(`\n站内链接：全部可解析（已核对 ${results.length} 页的所有内部 href）`);
  }

  // ---- 标签大小写冲突 ----
  // Windows / macOS 的文件系统不区分大小写：两个只差大小写的标签会落到
  // 同一个输出目录，互相覆盖。Linux 上却会生成两个目录 —— 也就是说
  // 这个问题在本地表现为"有一个标签页 404"，在 CI 上却完全看不出来。
  // 所以必须直接查内容源，而不是查产物。
  const tagForms = new Map();
  const postsDir = path.resolve(process.cwd(), "src/content/posts");
  const scanPost = (file) => {
    const text = fs.readFileSync(file, "utf8");
    const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) return;
    const line = fm[1].split(/\r?\n/).find((l) => l.trim().startsWith("tags:"));
    if (!line) return;
    const inner = line.slice(line.indexOf(":") + 1).replace(/[[\]]/g, "");
    for (const raw of inner.split(",")) {
      const tag = raw.trim();
      if (!tag) continue;
      const key = tag.toLowerCase();
      if (!tagForms.has(key)) tagForms.set(key, new Set());
      tagForms.get(key).add(tag);
    }
  };
  if (fs.existsSync(postsDir)) {
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith(".md") || e.name.endsWith(".mdx")) scanPost(full);
      }
    };
    walk(postsDir);
  }
  const collisions = [...tagForms.entries()].filter(([, v]) => v.size > 1);
  if (collisions.length) {
    console.log(`\n=== 标签大小写冲突（${collisions.length} 组）===`);
    for (const [key, forms] of collisions) {
      console.log(`  "${key}" 有 ${[...forms].map((f) => `"${f}"`).join(" / ")} 两种写法`);
      console.log(`      在 Windows/macOS 上会落到同一个目录互相覆盖，Linux 上则是两个标签页`);
    }
  } else {
    console.log(`\n标签大小写：无冲突（已核对 ${tagForms.size} 个标签）`);
  }

  console.log(
    `\n总计 ${results.length} 条路由，${failed.length} 条渲染有问题，${broken.size} 个断链，${collisions.length} 组标签大小写冲突` +
      (failed.length ? `\n失败清单：\n  ${failed.map((f) => f.route).join("\n  ")}` : "")
  );

  ws.close();
  server.close();
  ch.kill();
  process.exit(failed.length || broken.size || collisions.length ? 1 : 0);
})();
