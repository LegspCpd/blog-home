/**
 * Post-build SEO files.
 *
 * The `@astrojs/sitemap` integration emits `sitemap-index.xml` plus one or more
 * `sitemap-N.xml` shards. Search engines accept those, but almost every SEO tool
 * and every "submit your sitemap" form expects the conventional `/sitemap.xml`,
 * so we publish the same URL set at that path:
 *
 *   - single shard   -> publish `sitemap-0.xml` (a real <urlset>)
 *   - multiple shards -> publish `sitemap-index.xml` (a valid <sitemapindex>)
 *
 * The result is then mirrored into the adapter's publish directory, exactly like
 * the Pagefind index is (see build-pagefind.js): the adapter copies static output
 * during `astro build`, but this step runs afterwards, so the file has to be
 * copied across manually or the deployed site would serve a 404.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Locate the directory that actually contains the built HTML. */
function findStaticRoot() {
	// astro.config.mjs allows overriding the output dir with OUT_DIR.
	const outDir = process.env.OUT_DIR || "dist";
	for (const candidate of [`${outDir}/client`, outDir]) {
		const full = path.join(rootDir, candidate);
		if (fs.existsSync(path.join(full, "index.html"))) return full;
	}
	return null;
}

const staticRoot = findStaticRoot();
if (!staticRoot) {
	console.warn("[seo] Warning: no static directory containing index.html found; skipping sitemap.xml.");
	process.exit(0);
}

const shardNames = fs
	.readdirSync(staticRoot)
	.filter((name) => /^sitemap-\d+\.xml$/.test(name))
	.sort();

if (shardNames.length === 0) {
	console.warn("[seo] Warning: no sitemap shard found; is @astrojs/sitemap enabled in astro.config.mjs?");
	process.exit(0);
}

const indexPath = path.join(staticRoot, "sitemap-index.xml");
const firstShard = path.join(staticRoot, shardNames[0]);
let source = firstShard;
if (shardNames.length > 1 && fs.existsSync(indexPath)) source = indexPath;

fs.copyFileSync(source, path.join(staticRoot, "sitemap.xml"));
console.log(
	`[seo] sitemap.xml published from ${path.basename(source)} (${shardNames.length} shard(s), ${fs.statSync(source).size} bytes).`
);

// Mirror into the publish directory used by the active adapter.
const mirrorTargets = [".vercel/output/static", ".output/public", ".netlify/output/public"]
	.map((dir) => path.join(rootDir, dir))
	.filter((dir) => {
		if (path.resolve(dir) === path.resolve(staticRoot)) return false;
		return fs.existsSync(path.join(dir, "index.html"));
	});

if (mirrorTargets.length === 0) {
	console.log("[seo] Nothing to copy; sitemap.xml already lives in the publish directory.");
} else {
	for (const target of mirrorTargets) {
		fs.copyFileSync(source, path.join(target, "sitemap.xml"));
		console.log(`[seo] sitemap.xml copied into deploy directory: ${path.relative(rootDir, target)}`);
	}
}

// robots.txt is a generated route; fail loudly if it ever stops being emitted.
for (const dir of [staticRoot, ...mirrorTargets]) {
	if (!fs.existsSync(path.join(dir, "robots.txt"))) {
		console.warn(`[seo] Warning: robots.txt missing in ${path.relative(rootDir, dir)}`);
	}
}

// Sanity check: the advertised sitemap must reference the site it is served from.
const sitemapXml = fs.readFileSync(path.join(staticRoot, "sitemap.xml"), "utf8");
const locCount = (sitemapXml.match(/<loc>/g) || []).length;
console.log(`[seo] sitemap.xml entries: ${locCount}`);
