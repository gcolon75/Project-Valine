#!/usr/bin/env node

/**
 * Cross-platform build script selector for Prisma Lambda Layer
 * 
 * This script detects the current platform and runs the appropriate
 * build script (PowerShell for Windows, Bash for Unix-like systems).
 * 
 * Usage: node scripts/build-layer-selector.js
 */

import { execSync } from 'child_process';
import { platform as osPlatform } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const platform = osPlatform();

console.log(`Detected platform: ${platform}`);

try {
  if (platform === 'win32') {
    console.log('Using PowerShell build script...');
    const psScript = join(__dirname, 'build-prisma-layer.ps1');
    execSync(`powershell -ExecutionPolicy Bypass -File "${psScript}"`, { 
      stdio: 'inherit',
      shell: true,
      cwd: join(__dirname, '..')
    });
  } else {
    console.log('Using Bash build script...');
    const bashScript = join(__dirname, 'build-prisma-layer.sh');
    execSync(`bash "${bashScript}"`, { 
      stdio: 'inherit',
      shell: true,
      cwd: join(__dirname, '..')
    });
  }
  console.log('Build completed successfully.');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
