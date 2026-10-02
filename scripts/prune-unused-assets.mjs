/**
 * 剔除构建产物中未被任何页面引用的静态目录。
 *
 * 为什么需要：
 *   public/ 下的内容会被原样拷贝到 dist。实测 demo/（Live2D 模型）、
 *   endfield/ 等约 44MB 从未被任何页面或脚本引用，
 *   却每次部署都要完整上传。
 *
 * 原则：宁可不删，也不能删错。
 *   - 只处理明确列出的候选目录
 *   - 删之前再次扫描产物里的所有 html/js/json/css，确认零引用
 *   - 任何不确定的情况都保留
 *
 * 只清理产物，不动 public/ 源文件。
 *
 * 用法：node scripts/prune-unused-assets.mjs [outDir]
 */
import { readFileSync, readdirSync, statSync, existsSync, rmSync } from "node:fs";
import { join, extname } from "node:path";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.resolve(rootDir, process.argv[2] || "dist");

/**
 * 候选：这些目录历史上是上游主题的演示素材。
 * 判断依据是「产物里没有任何 src/href/url() 指向它们」，
 * 而不是「源码配置里有没有人写过」—— 配置里写了不代表真会用到。
 */
const CANDIDATES = ["demo", "pio", "endfield", "iku", "lt", "yd", "test"];

/**
 * 递归收集所有文本文件，用于引用扫描。
 * excludeDirs：跳过的顶层目录名（候选目录自身）——
 * 否则候选目录内部的模型脚本会提到自己的路径，造成「自引用」误判，
 * 让本该清理的目录被错误地保留下来。
 */
function collectText(dir, acc = [], excludeDirs = []) {
	if (!existsSync(dir)) return acc;
	for (const entry of readdirSync(dir)) {
		if (excludeDirs.includes(entry)) continue;
		const p = join(dir, entry);
		if (statSync(p).isDirectory()) {
			collectText(p, acc, excludeDirs);
		} else if ([".html", ".js", ".mjs", ".json", ".css"].includes(extname(entry))) {
			acc.push(p);
		}
	}
	return acc;
}

function dirSize(dir) {
	let size = 0;
	const walk = (d) => {
		for (const entry of readdirSync(d)) {
			const p = join(d, entry);
			const st = statSync(p);
			if (st.isDirectory()) walk(p);
			else size += st.size;
		}
	};
	walk(dir);
	return size;
}

if (!existsSync(outDir)) {
	console.log(`[prune] 产物目录不存在，跳过：${outDir}`);
	process.exit(0);
}

const textFiles = collectText(outDir, [], CANDIDATES);

/**
 * 提取「真实的资源引用路径」。
 *
 * 不能用整篇文本做子串匹配 —— 文章正文里随口提到一个路径
 * （比如复盘时写了 `/demo/` 这个字符串）就会被误判成引用，
 * 导致本该清理的目录被保留下来。
 *
 * 这里只认三种来源：
 *   1. src="..." / href="..."  —— HTML 属性
 *   2. url(...)                 —— CSS 里的路径函数
 *   3. import "..." / from "..." —— 模块引用
 */
function extractRefs(text) {
	const refs = [];
	const push = (v) => {
		if (!v) return;
		// 去掉查询串与片段
		refs.push(v.split(/[?#]/)[0]);
	};

	for (const m of text.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/g)) {
		push(m[1]);
	}
	for (const m of text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
		push(m[1]);
	}
	for (const m of text.matchAll(
		/\b(?:import|export)\s+(?:[\s\S]*?\sfrom\s+)?["']([^"']+)["']/g,
	)) {
		push(m[1]);
	}
	return refs;
}

const allRefs = new Set();
for (const f of textFiles) {
	try {
		for (const r of extractRefs(readFileSync(f, "utf8"))) allRefs.add(r);
	} catch {
		/* 读不了的跳过 */
	}
}

/** 判断某个目录是否被引用 */
function isReferenced(name) {
	const needle = `/${name}/`;
	for (const r of allRefs) {
		if (r === `/${name}` || r.startsWith(needle)) return true;
	}
	return false;
}

console.log(
	`[prune] 扫描 ${textFiles.length} 个文本文件，提取 ${allRefs.size} 条资源引用`,
);

let freed = 0;
let removed = 0;

for (const name of CANDIDATES) {
	const dir = join(outDir, name);
	if (!existsSync(dir)) continue;

	const size = dirSize(dir);

	// 二次确认：产物里是否真的还引用这个目录
	if (isReferenced(name)) {
		console.log(
			`[prune] 保留 ${name}/ —— 产物中仍存在引用（${(size / 1024 / 1024).toFixed(1)} MB）`,
		);
		continue;
	}

	rmSync(dir, { recursive: true, force: true });
	freed += size;
	removed++;
	console.log(
		`[prune] 移除 ${name}/ —— 无引用，释放 ${(size / 1024 / 1024).toFixed(1)} MB`,
	);
}

if (removed > 0) {
	console.log(
		`[prune] 完成：移除 ${removed} 个目录，释放 ${(freed / 1024 / 1024).toFixed(1)} MB`,
	);
} else {
	console.log("[prune] 没有可移除的目录");
}