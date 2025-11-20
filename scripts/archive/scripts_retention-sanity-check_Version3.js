#!/usr/bin/env node
/**
 * Ensures dist/index.html's main bundle exists in S3 before pruning.
 * Optional: compare against remote production index.html.
 *
 * Usage:
 *   node scripts/retention-sanity-check.js --bucket valine-frontend-prod
 *   node scripts/retention-sanity-check.js --bucket valine-frontend-prod --remote-domain dkmxy676d3vgc.cloudfront.net
 */
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import https from 'https';
import path from 'path';

const args = process.argv.slice(2);
const arg = (f, d=null) => {
  const i = args.indexOf(f);
  return i !== -1 && args[i+1] ? args[i+1] : d;
};

const bucket = arg('--bucket');
const remoteDomain = arg('--remote-domain');
const indexPath = path.resolve('dist/index.html');

if (!bucket) {
  console.error('ERROR: --bucket required');
  process.exit(1);
}

let html;
try { html = readFileSync(indexPath, 'utf8'); }
catch (e) {
  console.error('ERROR: cannot read dist/index.html:', e.message);
  process.exit(1);
}

const m = html.match(/\/assets\/index-[^"]+\.js/);
if (!m) {
  console.error('ERROR: no /assets/index-*.js reference in dist/index.html');
  process.exit(1);
}
const localBundle = m[0];
const s3Key = localBundle.replace(/^\//,'');

console.log('Local bundle:', localBundle);

function headS3(key) {
  try {
    const out = execSync(`aws s3api head-object --bucket ${bucket} --key ${key} --query '{CT:ContentType,CC:CacheControl}' --output json`,
      { stdio:['ignore','pipe','pipe'] }).toString();
    return JSON.parse(out);
  } catch {
    return null;
  }
}

const info = headS3(s3Key);
if (!info) {
  console.error(`ERROR: S3 object missing: s3://${bucket}/${s3Key}`);
  process.exit(1);
}
console.log(`S3 OK: CT=${info.CT} CC=${info.CC}`);

if (remoteDomain) {
  console.log('Fetching remote index.html...');
  const remoteHtml = await new Promise((resolve, reject) => {
    https.get({
      hostname: remoteDomain,
      path: '/index.html?diag=' + Date.now(),
      headers: { 'User-Agent': 'retention-sanity-check/1.0' }
    }, res => {
      let buf=''; res.on('data',c=>buf+=c); res.on('end',()=>resolve(buf));
    }).on('error', reject)
      .setTimeout(10000,()=>reject(new Error('timeout')));
  }).catch(e => {
    console.error('ERROR: remote fetch failed:', e.message);
    process.exit(2);
  });

  const rm = remoteHtml.match(/\/assets\/index-[^"]+\.js/);
  if (!rm) {
    console.error('ERROR: remote index.html had no bundle reference');
    process.exit(2);
  }
  const remoteBundle = rm[0];
  console.log('Remote bundle:', remoteBundle);
  if (remoteBundle !== localBundle) {
    console.warn(`WARNING: local (${localBundle}) differs from remote (${remoteBundle}); do not prune remote bundle.`);
  }
}

console.log('Retention sanity check passed.');
process.exit(0);