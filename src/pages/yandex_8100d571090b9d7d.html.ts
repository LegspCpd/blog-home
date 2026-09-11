import type { APIRoute } from "astro";
import { siteConfig } from "@/config";

export const prerender = true;

export const GET: APIRoute = () => {
	return new Response(
		siteConfig.webmasterVerification?.files?.["yandex_8100d571090b9d7d"] || "",
		{ headers: { "Content-Type": "text/plain; charset=utf-8" } },
	);
};
