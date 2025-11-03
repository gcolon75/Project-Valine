# Image Optimization Guide

## Current Status

Phase 09 Performance Audit identified 6 oversized images totaling ~12.2 MB that need optimization.

## Images Requiring Optimization

| Image | Current Size | Target Size | Location |
|-------|-------------|-------------|----------|
| hero.jpg | 2.4 MB | < 200 KB | public/assets/ |
| login-artist.png | 2.5 MB | < 200 KB | public/assets/ |
| login-observer.png | 2.3 MB | < 200 KB | public/assets/ |
| login-seeker.png | 1.9 MB | < 200 KB | public/assets/ |
| logo.png | 1.2 MB | < 100 KB | public/assets/ |
| pattern.jpg | 2.0 MB | < 200 KB | public/assets/ |

**Total Current:** 12.3 MB  
**Total Target:** < 1.3 MB  
**Savings:** ~11 MB (89% reduction)

## Recommended Tools

### Online Tools (No Installation)
1. **Squoosh** - https://squoosh.app/
   - Free, web-based
   - Supports WebP, AVIF conversion
   - Side-by-side comparison
   - Advanced compression options

2. **TinyPNG** - https://tinypng.com/
   - Great for PNG compression
   - Batch processing
   - API available

3. **Compressor.io** - https://compressor.io/
   - Supports JPG, PNG, SVG, GIF
   - Lossy and lossless compression

### Command Line Tools
1. **sharp** (Node.js)
   ```bash
   npm install -g sharp-cli
   sharp -i input.jpg -o output.webp --webp
   ```

2. **imagemagick**
   ```bash
   convert input.jpg -quality 85 -resize 1920x output.jpg
   magick convert input.png -define webp:lossless=false output.webp
   ```

3. **cwebp** (Google's WebP encoder)
   ```bash
   cwebp -q 80 input.jpg -o output.webp
   ```

## Optimization Strategy

### 1. Convert to Modern Formats

**WebP Format** (Primary)
- 25-35% smaller than JPEG/PNG
- Excellent browser support (95%+)
- Supports transparency (PNG replacement)

**Fallback Strategy:**
```html
<picture>
  <source srcset="image.webp" type="image/webp">
  <source srcset="image.jpg" type="image/jpeg">
  <img src="image.jpg" alt="Description" loading="lazy">
</picture>
```

### 2. Resize Images

Most images don't need to be larger than:
- **Hero images:** 1920x1080px (Full HD)
- **Feature images:** 1200x800px
- **Thumbnails:** 400x300px
- **Logos:** 512x512px (or use SVG)

### 3. Compression Settings

**For JPEGs:**
- Quality: 80-85 (sweet spot)
- Progressive encoding
- Strip metadata

**For PNGs:**
- Use palette-based compression
- Remove alpha channel if not needed
- Consider converting to WebP

**For WebP:**
- Quality: 75-80
- Lossless for graphics/logos
- Lossy for photos

### 4. Responsive Images

Use `srcset` for different screen sizes:
```html
<img 
  srcset="image-320w.webp 320w,
          image-640w.webp 640w,
          image-1024w.webp 1024w"
  sizes="(max-width: 640px) 100vw, 640px"
  src="image-640w.webp"
  alt="Description"
  loading="lazy"
/>
```

## Step-by-Step Optimization

### Using Squoosh (Recommended for Beginners)

1. **Visit** https://squoosh.app/
2. **Drag and drop** your image
3. **Select WebP** format on the right panel
4. **Adjust quality** slider (aim for 75-80)
5. **Compare** original vs compressed (should look nearly identical)
6. **Download** the optimized image
7. **Rename** to match original (e.g., hero.jpg → hero.webp)

### Using Node.js Script

Create `scripts/optimize-images.js`:

```javascript
import sharp from 'sharp';
import { readdirSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const inputDir = './public/assets';
const outputDir = './public/assets/optimized';

// Create output directory
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// Process all images
const images = readdirSync(inputDir).filter(file => 
  /\.(jpg|jpeg|png)$/i.test(file)
);

for (const image of images) {
  const inputPath = join(inputDir, image);
  const outputName = image.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  const outputPath = join(outputDir, outputName);
  
  console.log(`Optimizing ${image}...`);
  
  await sharp(inputPath)
    .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(outputPath);
  
  console.log(`✓ Created ${outputName}`);
}

console.log('All images optimized!');
```

Run with:
```bash
npm install sharp
node scripts/optimize-images.js
```

## Implementation Steps

### 1. Optimize Images
- [ ] Optimize hero.jpg → hero.webp (~2.4 MB → ~200 KB)
- [ ] Optimize login-artist.png → login-artist.webp (~2.5 MB → ~200 KB)
- [ ] Optimize login-observer.png → login-observer.webp (~2.3 MB → ~200 KB)
- [ ] Optimize login-seeker.png → login-seeker.webp (~1.9 MB → ~200 KB)
- [ ] Optimize logo.png → logo.webp or SVG (~1.2 MB → ~50 KB)
- [ ] Optimize pattern.jpg → pattern.webp (~2.0 MB → ~150 KB)

### 2. Update Code

Replace direct image references with `<picture>` elements or LazyImage component:

**Before:**
```jsx
<img src="/assets/hero.jpg" alt="Hero" />
```

**After (with fallback):**
```jsx
<picture>
  <source srcset="/assets/hero.webp" type="image/webp" />
  <img src="/assets/hero.jpg" alt="Hero" loading="lazy" />
</picture>
```

**Or use LazyImage component:**
```jsx
import LazyImage from '../components/LazyImage';

<LazyImage 
  src="/assets/hero.webp" 
  alt="Hero"
  className="w-full h-auto"
/>
```

### 3. Verify Optimization

Run the performance audit:
```bash
npm run build
npm run perf:audit
```

Expected results:
- ✅ Total images < 1.5 MB
- ✅ No single image > 500 KB
- ✅ Faster page load times
- ✅ Improved Lighthouse scores

## Browser Support

### WebP Support
- Chrome/Edge: ✅ (v23+)
- Firefox: ✅ (v65+)
- Safari: ✅ (v14+)
- iOS Safari: ✅ (v14+)
- Android: ✅ (v4.0+)

**Coverage:** 95%+ of users

### Fallback Strategy
Always provide JPEG/PNG fallback for older browsers:
```html
<picture>
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="...">
</picture>
```

## Performance Impact

### Before Optimization
- **Initial Page Load:** ~15 MB transferred
- **Time to Interactive:** ~8-10 seconds (3G)
- **Lighthouse Performance:** ~60-70

### After Optimization (Expected)
- **Initial Page Load:** ~3-4 MB transferred
- **Time to Interactive:** ~3-4 seconds (3G)
- **Lighthouse Performance:** ~85-95

**Improvement:**
- 📉 75% reduction in data transfer
- ⚡ 60% faster load time
- 📈 20-30 point Lighthouse boost

## Best Practices

1. **Always use `loading="lazy"`** for below-fold images
2. **Provide `width` and `height`** to prevent layout shift (CLS)
3. **Use CSS aspect-ratio** to reserve space before load
4. **Compress images before committing** to version control
5. **Use a CDN** for image delivery in production
6. **Monitor bundle size** with `npm run perf:audit`

## Image Guidelines for Future Assets

When adding new images:

| Type | Format | Max Size | Max Dimensions |
|------|--------|----------|----------------|
| Photos | WebP/JPEG | 200 KB | 1920x1080 |
| Illustrations | WebP/PNG | 150 KB | 1200x800 |
| Icons | SVG | 10 KB | Vector |
| Logos | SVG/WebP | 50 KB | 512x512 |
| Thumbnails | WebP | 50 KB | 400x300 |

## Resources

- [Web.dev Image Optimization](https://web.dev/fast/#optimize-your-images)
- [WebP Documentation](https://developers.google.com/speed/webp)
- [Squoosh App](https://squoosh.app/)
- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [Lighthouse Image Optimization](https://developer.chrome.com/docs/lighthouse/performance/uses-optimized-images/)

## Automation

Consider adding a pre-commit hook to check image sizes:

```bash
#!/bin/bash
# .git/hooks/pre-commit

MAX_SIZE=512000 # 500 KB in bytes

for file in $(git diff --cached --name-only | grep -E '\.(jpg|jpeg|png)$'); do
  size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
  if [ "$size" -gt "$MAX_SIZE" ]; then
    echo "❌ Error: $file is too large ($size bytes)"
    echo "   Please optimize to < 500 KB"
    exit 1
  fi
done
```

## Next Steps

1. **Immediate:** Optimize all 6 images using Squoosh or sharp
2. **Short-term:** Update code to use optimized images with fallbacks
3. **Medium-term:** Implement lazy loading for all images
4. **Long-term:** Set up automated image optimization in CI/CD

---

**Phase 09 Deliverable:** This guide documents the optimization strategy.  
**Actual optimization:** Should be done as part of Phase 10 or by designer/maintainer.
