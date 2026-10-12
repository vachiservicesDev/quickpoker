import type { MetadataRoute } from "next";
import { QUIZZES } from "@/lib/quizzes";
import { RESOURCES } from "@/lib/toolkit";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://quickpoker.app";
  const paths = [
    "",
    "/about",
    "/feedback",
    "/privacy",
    "/services",
    "/pricing",
    "/newsletter",
    "/toolkit",
    ...RESOURCES.map((r) => `/toolkit/${r.slug}`),
    "/quiz",
    ...QUIZZES.map((q) => `/quiz/${q.slug}`),
  ];
  return paths.map((path) => ({ url: `${site}${path}` }));
}
