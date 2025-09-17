// Usage: node scripts/check-imports.mjs [projectDir]
// Scans for broken relative imports in JS/TS/React files.
import fs from 'fs'
import path from 'path'
import url from 'url'

const exts = ['.js', '.jsx', '.ts', '.tsx']
const indexNames = exts.map(e => '/index' + e)

const projectRoot = path.resolve(process.argv[2] || '.')
const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.vite'])

/** Collect all source files */
function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoreDirs.has(entry.name)) continue
    const fp = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(fp)
    } else if (exts.includes(path.extname(entry.name))) {
      yield fp
    }
  }
}

function parseImports(code) {
  const rx = /(?:import\s+[^'"]*from\s*|import\(\s*)['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g
  const results = []
  let m
  while ((m = rx.exec(code))) {
    const spec = m[1] || m[2]
    if (spec && (spec.startsWith('./') || spec.startsWith('../'))) {
      results.push(spec)
    }
  }
  return results
}

function resolveLikeNode(baseFile, spec) {
  const baseDir = path.dirname(baseFile)
  const target = path.resolve(baseDir, spec)

  // 1) exact file
  if (fs.existsSync(target) && fs.statSync(target).isFile()) return target

  // 2) try extensions
  for (const ext of exts) {
    if (fs.existsSync(target + ext) && fs.statSync(target + ext).isFile()) return target + ext
  }

  // 3) directory index
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    for (const idx of indexNames) {
      const p = target + idx
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return p
    }
  }

  return null
}

const missing = []
for (const file of walk(projectRoot)) {
  const code = fs.readFileSync(file, 'utf8')
  const imports = parseImports(code)
  for (const spec of imports) {
    const resolved = resolveLikeNode(file, spec)
    if (!resolved) {
      missing.push({ file: path.relative(projectRoot, file), import: spec })
    }
  }
}

if (missing.length) {
  console.log('❌ Unresolved imports (%d):', missing.length)
  for (const m of missing) console.log(` - ${m.file} -> ${m.import}`)
  process.exitCode = 1
} else {
  console.log('✅ No broken relative imports found.')
}
