// Prints which files your app is actually loading (index.html -> main -> App)
import fs from 'fs'
import path from 'path'

const repo = process.cwd()
const idx = path.join(repo, 'index.html')
function findMainFromIndex() {
  if (!fs.existsSync(idx)) return null
  const html = fs.readFileSync(idx, 'utf8')
  const m = html.match(/src=["']\/?src\/(main\.(?:jsx?|tsx?))["']/i)
  return m ? ('src/' + m[1]) : null
}

function findAppFromMain(mainPath) {
  if (!mainPath || !fs.existsSync(path.join(repo, mainPath))) return null
  const code = fs.readFileSync(path.join(repo, mainPath), 'utf8')
  // match import App from './App' or './App.jsx'
  const m = code.match(/import\s+App\s+from\s+['"](.+?)['"]/)
  if (!m) return null
  let spec = m[1]
  if (!spec.startsWith('.')) return null
  const base = path.dirname(path.join(repo, mainPath))
  let target = path.resolve(base, spec)
  const tryExt = ['.jsx', '.tsx', '.js', '.ts']
  if (fs.existsSync(target) && fs.statSync(target).isFile()) return path.relative(repo, target)
  for (const e of tryExt) {
    if (fs.existsSync(target + e)) return path.relative(repo, target + e)
  }
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    for (const e of tryExt) {
      const p = target + '/index' + e
      if (fs.existsSync(p)) return path.relative(repo, p)
    }
  }
  return `(unresolved spec: ${spec})`
}

const main = findMainFromIndex() || 'src/main.jsx'
const app = findAppFromMain(main)
console.log('[who-is-my-app] index entry  :', main)
console.log('[who-is-my-app] App resolves :', app || '(not found)')

// List likely routers
function* walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, ent.name)
    if (ent.isDirectory()) yield* walk(fp)
    else if (/\.(jsx?|tsx?)$/.test(ent.name)) yield fp
  }
}
const routesDir = path.join(repo, 'src', 'routes')
if (fs.existsSync(routesDir)) {
  const candidates = []
  for (const f of walk(routesDir)) {
    const s = fs.readFileSync(f, 'utf8')
    if (s.includes('react-router-dom') && (s.includes('<Routes') || s.includes('<Route'))) {
      candidates.push(path.relative(repo, f))
    }
  }
  console.log('[who-is-my-app] router candidates under src/routes:')
  for (const c of candidates) console.log('  -', c)
} else {
  console.log('[who-is-my-app] No src/routes directory found.')
}
