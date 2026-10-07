/**
 * 结构化数据校验：解析每页的 JSON-LD，确认是合法 JSON 且关键字段齐全。
 * 富媒体结果（星级、作者、面包屑）依赖它，语法错误会让 Google 静默忽略。
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";
const pages = [
  "index.html",
  "posts/making-blog-feel-like-claude/index.html",
  "archive/index.html",
  "tags/index.html",
  "404.html",
];

let failures = 0;
const fail = (m) => {
  failures++;
  console.log(`  FAIL ${m}`);
};
const pass = (m) => console.log(`  ok   ${m}`);

/** 从页面里读 <link rel=canonical> 的 href，用于交叉校验 */
function canonicalOf(html) {
  const m = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/);
  return m ? m[1] : null;
}

for (const p of pages) {
  const f = join(DIST, p);
  if (!existsSync(f)) {
    fail(`${p} missing`);
    continue;
  }
  const html = readFileSync(f, "utf8");
  const blocks = [...html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
  )].map((m) => m[1]);

  if (blocks.length === 0) {
    fail(`${p}: no JSON-LD block`);
    continue;
  }

  let parsed = null;
  try {
    parsed = JSON.parse(blocks[0]);
  } catch (e) {
    fail(`${p}: invalid JSON — ${e.message.slice(0, 60)}`);
    continue;
  }

  const graph = parsed["@graph"];
  if (!Array.isArray(graph) || graph.length === 0) {
    fail(`${p}: @graph missing or empty`);
    continue;
  }

  const types = graph.map((n) => n["@type"]);
  if (!types.includes("WebSite")) {
    fail(`${p}: WebSite node missing (got ${types.join(",")})`);
    continue;
  }
  if (!types.includes("WebPage")) {
    fail(`${p}: WebPage node missing (got ${types.join(",")})`);
    continue;
  }

  const website = graph.find((n) => n["@type"] === "WebSite");
  const url = website.url || "";
  if (!url.startsWith("https://legspcpd.asia")) {
    fail(`${p}: WebSite url wrong domain -> ${url}`);
    continue;
  }
  if (url.includes("blog.legspcpd.top")) {
    fail(`${p}: old domain present in JSON-LD`);
    continue;
  }

  // 文章页必须带 BlogPosting，且关键字段不能缺 ——
  // Google 缺 datePublished 或 author 时会直接放弃富媒体结果。
  if (p.includes("/posts/")) {
    const bp = graph.find((n) => n["@type"] === "BlogPosting");
    if (!bp) {
      fail(`${p}: post page missing BlogPosting`);
      continue;
    }
    const missingFields = ["headline", "datePublished", "author", "url"].filter(
      (k) => !bp[k]
    );
    if (missingFields.length) {
      fail(`${p}: BlogPosting missing ${missingFields.join(", ")}`);
      continue;
    }
    if (bp.url !== canonicalOf(html)) {
      fail(`${p}: BlogPosting url disagrees with canonical`);
      continue;
    }
    pass(
      `${p}: ${types.join("+")}, published=${bp.datePublished.slice(0, 10)}`
    );
    continue;
  }

  pass(`${p}: ${types.join("+")}, url=${url}`);
}

// 确认产物规模符合预期，避免「文件都没生成」被当成通过
const pageCount = (function walk(d) {
  let n = 0;
  for (const e of readdirSync(d)) {
    const s = statSync(join(d, e));
    if (s.isDirectory()) n += walk(join(d, e));
    else if (e.endsWith(".html")) n++;
  }
  return n;
})(DIST);

if (pageCount < 20) {
  fail(`only ${pageCount} html pages built (expected 50+)`);
} else {
  pass(`built pages: ${pageCount}`);
}

console.log(
  failures === 0
    ? "\nRESULT: all structured-data checks passed"
    : `\nRESULT: ${failures} failure(s)`
);
if (failures) process.exitCode = 1;