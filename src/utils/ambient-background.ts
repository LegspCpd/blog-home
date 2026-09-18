/**
 * 背景氛围（ambient background）工具
 * ---------------------------------------------------------------------------
 * 把 `backgroundAtmosphere` 配置编译成 CSS 自定义属性，交给 SupabaseLayout
 * 内联到 `<main>` 上，由 supabase-layout.css 消费。
 *
 * 为什么要用自定义属性而不是直接写 background：
 *   亮色/暗色两套强度要分别计算，写成一个属性就必须在 CSS 里再算一遍，
 *   这里直接把两套都生成好，CSS 按 `.dark` 二选一即可。
 *
 * 配置说明见 src/config/backgroundAtmosphere.ts
 */
import { backgroundAtmosphere } from "@/config/backgroundAtmosphere";

/** #rrggbb / #rgb → "r, g, b"；解析失败返回 null（调用方跳过该色块） */
function hexToRgbParts(hex: string): string | null {
	const value = hex.trim().replace(/^#/, "");
	const full =
		value.length === 3
			? value
					.split("")
					.map((c) => c + c)
					.join("")
			: value;
	if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
	const int = Number.parseInt(full, 16);
	return `${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}`;
}

/** 生成一组以逗号分隔的 radial-gradient 层 / Build the layered gradient string */
function buildGradient(intensity: number): string {
	const layers: string[] = [];

	for (const blob of backgroundAtmosphere.blobs) {
		const rgb = hexToRgbParts(blob.color);
		if (!rgb) continue;

		const peak = Math.max(0, Math.min(1, blob.alpha * intensity));
		if (peak <= 0) continue;

		// 65% 处已经完全透明：确保色块在被裁剪前就淡完，不会出现硬边
		layers.push(
			`radial-gradient(${blob.radius}px ${blob.radius}px at ${blob.x}% ${blob.y}%, rgba(${rgb}, ${peak.toFixed(3)}) 0%, rgba(${rgb}, 0) 65%)`,
		);
	}

	return layers.length > 0 ? layers.join(", ") : "none";
}

/**
 * 返回挂到 `<main>` 上的内联样式字符串；关闭氛围时返回 `undefined`。
 * Returns the inline style for `<main>`, or undefined when disabled.
 */
export function getAmbientBackgroundStyle(): string | undefined {
	if (!backgroundAtmosphere.enable) return undefined;

	const light = buildGradient(backgroundAtmosphere.lightIntensity);
	const dark = buildGradient(backgroundAtmosphere.darkIntensity);
	if (light === "none" && dark === "none") return undefined;

	return [
		`--su-ambient-light: ${light}`,
		`--su-ambient-dark: ${dark}`,
		`--su-ambient-size: 100% ${backgroundAtmosphere.layerHeight}px`,
	].join("; ");
}
