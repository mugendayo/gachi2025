import type { MetadataRoute } from "next";
import { site } from "@/data/site";

const PATHS = ["", "/guide", "/notice", "/kokoroe", "/admission", "/tokusho", "/privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((p) => ({ url: `${site.siteUrl}${p}` }));
}
