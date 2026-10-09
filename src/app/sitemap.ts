import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://quickpoker.app";
  return ["", "/about", "/feedback", "/privacy"].map((path) => ({ url: `${site}${path}` }));
}
