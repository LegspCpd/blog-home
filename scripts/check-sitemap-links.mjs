/**
 * sitemap 可达性校验：sitemap 里的每一条 URL 都必须对应一个真实产出的页面。
 *
 * 为什么需要：sitemap 格式正确但指向 404，对搜索引擎是纯粹的负信号 ——
 * 它会降低整个站点的抓取预算分配。格式校验抓不到这种问题。
 */
import { readFileSync, existsSync } from "node:fs";

const SITE = "https://legspcpd.asia";
const DIST = "dist";

const xml = readFileSync(`${DIST}/sitemap-0.xml`, "utf8");
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

if (locs.length === 0) {
  console.error("::error::sitemap-0.xml has no <loc> entries");
  process.exit(1);
}

const wrongDomain = locs.filter((u) => !u.startsWith(SITE));
if (wrongDomain.length) {
  console.error(`::error::${wrongDomain.length} URL(s) not on ${SITE}:`);
  for (const u of wrongDomain.slice(0, 10)) console.error(`  ${u}`);
  process.exit(1);
}

const missing = [];
for (const u of locs) {
  // sitemap 里是 URL 编码的中文（如 %E4%BC%98），磁盘上是解码后的目录名，
  // 必须先 decodeURIComponent 再查，否则中文标签页会全部误报为缺失。
  const pathname = decodeURIComponent(new URL(u).pathname);
  const file = `${DIST}${pathname.endsWith("/") ? `${pathname}index.html` : pathname}`;
  if (!existsSync(file)) missing.push(pathname);
}

if (missing.length) {
  console.error(`::error::${missing.length} sitemap URL(s) have no matching page:`);
  for (const m of missing.slice(0, 15)) console.error(`  ${m}`);
  process.exit(1);
}

const posts = locs.filter((u) => u.includes("/posts/")).length;
console.log(`OK: all ${locs.length} sitemap URLs resolve (${posts} posts)`);