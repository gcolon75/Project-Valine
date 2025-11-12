import { createRequire } from "module";
const require = createRequire(import.meta.url);

const skip = process.env.SKIP_SEO === "true";

if (skip) {
  console.log("[SEO] SKIP_SEO=true → Skipping SEO asset generation.");
  process.exit(0);
}

try {
  // Verify sharp presence
  require.resolve("sharp");
  console.log("[SEO] sharp detected. Generating SEO assets...");
  await import("./seo/generate-og-image.mjs");
  await import("./seo/generate-favicons.mjs");
  console.log("[SEO] SEO assets generated.");
} catch (e) {
  console.warn("[SEO] sharp not found or failed to load. Skipping SEO asset generation (non-fatal).");
}