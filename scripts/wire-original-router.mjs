// Auto-detect router under src/routes and rewire src/App.jsx to render it (backs up App.jsx)
import fs from 'fs'
import path from 'path'

const repo = process.cwd()
const srcDir = path.join(repo, 'src')
const routesDir = path.join(srcDir, 'routes')
if (!fs.existsSync(srcDir)) {
  console.error('[wire-original-router] src/ not found at repo root. Aborting.')
  process.exit(1)
}
if (!fs.existsSync(routesDir)) {
  console.error('[wire-original-router] src/routes/ not found. Aborting.')
  process.exit(1)
}

function* walk(dir){
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, ent.name)
    if (ent.isDirectory()) yield* walk(fp)
    else if (/\.(jsx?|tsx?)$/.test(ent.name)) yield fp
  }
}
// Scoring: prefer names like AppRoutes, Router, index under routes/ that actually use <Routes>/<Route>
function score(file, code){
  let s = 0
  const name = path.basename(file).toLowerCase()
  if (name.includes('approutes')) s += 5
  if (name.includes('router')) s += 4
  if (name === 'index.jsx' || name === 'index.tsx') s += 3
  if (code.includes('<Routes') || code.includes('<Route')) s += 5
  if (code.includes('createBrowserRouter') || code.includes('useRoutes')) s += 3
  return s
}
const cands = []
for (const f of walk(routesDir)) {
  const s = fs.readFileSync(f, 'utf8')
  if (s.includes('react-router-dom') && (s.includes('<Routes') || s.includes('<Route') || s.includes('useRoutes') || s.includes('createBrowserRouter'))) {
    cands.push([f, score(f, s)])
  }
}
if (!cands.length) {
  console.error('[wire-original-router] No router-looking files found under src/routes. Aborting.')
  process.exit(2)
}
cands.sort((a,b)=>b[1]-a[1])
const best = cands[0][0]
const importSpec = path.relative(srcDir, best).replace(/\\/g,'/').replace(/\.(jsx?|tsx?)$/,'')
console.log('[wire-original-router] selected router:', 'src/'+path.relative(srcDir, best))

// Try to detect a layout
let layoutSpec = null
const layoutsDir = path.join(srcDir, 'layouts')
if (fs.existsSync(layoutsDir)) {
  for (const ent of fs.readdirSync(layoutsDir)) {
    const fp = path.join(layoutsDir, ent)
    if (/\.(jsx?|tsx?)$/.test(ent)) {
      const code = fs.readFileSync(fp, 'utf8')
      if (/export\s+default\s+function\s+(AppLayout|RootLayout)/.test(code)) {
        layoutSpec = path.relative(srcDir, fp).replace(/\\/g,'/').replace(/\.(jsx?|tsx?)$/,'')
        break
      }
    }
  }
}

const appPath = path.join(srcDir, 'App.jsx')
const backup = path.join(srcDir, 'App.prev.jsx')
if (fs.existsSync(appPath) && !fs.existsSync(backup)) {
  fs.copyFileSync(appPath, backup)
  console.log('[wire-original-router] backup -> src/App.prev.jsx')
}

const wrapper = (layoutSpec
? `import AppLayout from '${layoutSpec}'\nimport AppRoutes from '${importSpec}'\nexport default function App(){ return (<AppLayout><AppRoutes/></AppLayout>) }\n`
: `import AppRoutes from '${importSpec}'\nexport default function App(){ return (<AppRoutes/>) }\n`)

fs.writeFileSync(appPath, wrapper)
console.log('[wire-original-router] wrote -> src/App.jsx')
