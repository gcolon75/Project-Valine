import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const skip = process.env.SKIP_SEO === 'true';

if (skip) {
  console.log('[SEO] SKIP_SEO=true -> Skipping SEO asset generation.');
} else {
  try {
    require.resolve('sharp');
    console.log('[SEO] sharp found. Running SEO generation...');
    await import('./seo/generate-og-image.mjs');
    await import('./seo/generate-favicons.mjs');
  } catch (e) {
    console.warn('[SEO] sharp not available. Skipping SEO asset generation.');
  }
}