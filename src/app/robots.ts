import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://quickpoker.app";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/p/", "/api/"] },
    sitemap: `${site}/sitemap.xml`,
  };
}
