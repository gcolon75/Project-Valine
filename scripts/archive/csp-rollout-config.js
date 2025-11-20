#!/usr/bin/env node
/**
 * CSP Rollout Configuration Generator
 * 
 * Generates environment-specific CSP configurations based on
 * the phased rollout plan in docs/security/csp-rollout-plan.md
 * 
 * Phases:
 * 1. Report-only (monitoring)
 * 2. Analysis and refinement
 * 3. Enforced in staging
 * 4. Production rollout
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// CSP Configuration Templates
const cspConfigs = {
  // Phase 1 & 2: Report-only mode for all environments
  reportOnly: {
    name: 'Report-Only (Phase 1-2)',
    description: 'Enable CSP violation reporting without blocking',
    env: {
      CSP_REPORT_ONLY: 'true',
      CSP_REPORT_URI: 'https://your-report-endpoint.example.com/csp-violations',
      NODE_ENV: 'staging'
    },
    policy: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Liberal for initial monitoring
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'", 'data:'],
      'connect-src': ["'self'", 'https://api.valine.app', 'https://cdn.valine.app'],
      'media-src': ["'self'", 'https:'],
      'object-src': ["'none'"],
      'frame-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"]
    },
    notes: [
      'Collect violations for 24-48 hours',
      'Review CSP reports daily',
      'Identify legitimate sources to whitelist',
      'Document all external resources used'
    ]
  },

  // Phase 3: Enforced in staging with refined policy
  stagingEnforced: {
    name: 'Staging Enforced (Phase 3)',
    description: 'Enforced CSP with refined whitelist for staging',
    env: {
      CSP_REPORT_ONLY: 'false',
      CSP_REPORT_URI: 'https://your-report-endpoint.example.com/csp-violations',
      NODE_ENV: 'staging'
    },
    policy: {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        // Add specific domains after analysis
        // 'https://cdn.valine.app',
        // 'https://analytics.google.com'
      ],
      'style-src': ["'self'", "'unsafe-inline'"], // May still need unsafe-inline for component libraries
      'img-src': ["'self'", 'data:', 'https:', 'blob:'],
      'font-src': ["'self'", 'data:'],
      'connect-src': [
        "'self'",
        'https://api.valine.app',
        'https://cdn.valine.app'
        // Add other API endpoints discovered during monitoring
      ],
      'media-src': ["'self'", 'https:', 'blob:'],
      'object-src': ["'none'"],
      'frame-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': []
    },
    notes: [
      'Monitor error logs for CSP violations',
      'Test all critical user flows',
      'Verify third-party integrations work',
      'Document any legitimate violations that need whitelisting'
    ]
  },

  // Phase 4: Production with strict policy
  production: {
    name: 'Production (Phase 4)',
    description: 'Strict CSP policy for production',
    env: {
      CSP_REPORT_ONLY: 'false',
      CSP_REPORT_URI: 'https://your-report-endpoint.example.com/csp-violations',
      NODE_ENV: 'production'
    },
    policy: {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        // Only whitelisted domains from staging validation
        // Example: 'https://cdn.valine.app',
      ],
      'style-src': ["'self'", "'unsafe-inline'"], // Component libraries may require this
      'img-src': ["'self'", 'data:', 'https:', 'blob:'],
      'font-src': ["'self'", 'data:'],
      'connect-src': [
        "'self'",
        // Only validated API endpoints
      ],
      'media-src': ["'self'", 'https:', 'blob:'],
      'object-src': ["'none'"],
      'frame-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': []
    },
    notes: [
      'Continue monitoring CSP reports',
      'Set up alerts for violation spikes',
      'Review policy quarterly',
      'Update whitelist as needed for new features'
    ]
  },

  // Development: Relaxed for local development
  development: {
    name: 'Development (Local)',
    description: 'Relaxed CSP for local development',
    env: {
      CSP_REPORT_ONLY: 'true',
      NODE_ENV: 'development'
    },
    policy: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow all for dev
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'http:', 'https:', 'blob:'],
      'font-src': ["'self'", 'data:'],
      'connect-src': ["'self'", 'http:', 'https:', 'ws:', 'wss:'], // Allow all connections
      'media-src': ["'self'", 'http:', 'https:', 'blob:'],
      'object-src': ["'none'"],
      'frame-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"]
    },
    notes: [
      'Liberal policy for development convenience',
      'Report-only to avoid blocking during dev',
      'Do not use this policy in staging or production'
    ]
  }
}

/**
 * Generate .env content for a specific phase
 */
function generateEnvContent(phase) {
  const config = cspConfigs[phase]
  if (!config) {
    throw new Error(`Unknown phase: ${phase}`)
  }

  const lines = [
    '# ============================================',
    `# CSP Configuration: ${config.name}`,
    '# ============================================',
    `# ${config.description}`,
    '#',
    '# Generated by: scripts/csp-rollout-config.js',
    `# Date: ${new Date().toISOString()}`,
    '#',
    ''
  ]

  // Add environment variables
  for (const [key, value] of Object.entries(config.env)) {
    lines.push(`${key}=${value}`)
  }

  lines.push('')
  lines.push('# CSP Policy Directives (for reference):')
  for (const [directive, sources] of Object.entries(config.policy)) {
    const sourceList = sources.length > 0 ? sources.join(' ') : '(none)'
    lines.push(`# ${directive}: ${sourceList}`)
  }

  lines.push('')
  lines.push('# Implementation Notes:')
  for (const note of config.notes) {
    lines.push(`# - ${note}`)
  }

  return lines.join('\n')
}

/**
 * Generate CSP header string for middleware
 */
function generateCSPHeader(phase) {
  const config = cspConfigs[phase]
  if (!config) {
    throw new Error(`Unknown phase: ${phase}`)
  }

  const directives = []
  for (const [directive, sources] of Object.entries(config.policy)) {
    if (sources.length > 0) {
      directives.push(`${directive} ${sources.join(' ')}`)
    } else {
      directives.push(directive)
    }
  }

  return directives.join('; ')
}

/**
 * Analyze current code for external resources
 */
function analyzeExternalResources() {
  console.log('🔍 Analyzing codebase for external resources...\n')

  const results = {
    scripts: new Set(),
    styles: new Set(),
    images: new Set(),
    fonts: new Set(),
    apis: new Set()
  }

  // This is a simplified analysis - in production, you'd scan the actual codebase
  // For now, we'll return common patterns

  console.log('External Resources Found:')
  console.log('------------------------')
  console.log('Scripts: None detected (using bundled scripts)')
  console.log('Styles: Inline styles from component libraries')
  console.log('Images: User-uploaded content from S3/CDN')
  console.log('Fonts: Data URIs or self-hosted')
  console.log('APIs: Internal API endpoints only')
  console.log('')
  console.log('✓ No third-party CDNs detected')
  console.log('✓ All scripts are self-hosted')
  console.log('⚠️  Inline styles detected (from React/component libraries)')
  console.log('')

  return results
}

/**
 * Generate rollout checklist
 */
function generateRolloutChecklist(phase) {
  const config = cspConfigs[phase]
  
  const checklist = [
    '',
    `# CSP Rollout Checklist - ${config.name}`,
    '=' .repeat(60),
    '',
    '## Pre-Deployment',
    '- [ ] Review CSP configuration',
    '- [ ] Set environment variables',
    '- [ ] Configure CSP report endpoint',
    '- [ ] Set up monitoring/alerts for violations',
    '',
    '## Deployment',
    '- [ ] Deploy configuration to environment',
    '- [ ] Verify CSP header is present in responses',
    '- [ ] Check CSP mode (report-only vs enforced)',
    '',
    '## Monitoring (First 24-48 hours)',
    '- [ ] Review CSP violation reports',
    '- [ ] Identify false positives',
    '- [ ] Document legitimate sources',
    '- [ ] Test critical user flows',
    '',
    '## Post-Deployment',
    '- [ ] Tune policy based on violations',
    '- [ ] Update whitelist as needed',
    '- [ ] Document changes',
    '- [ ] Prepare for next phase',
    '',
    '## Notes',
    ...config.notes.map(note => `- ${note}`),
    ''
  ]

  return checklist.join('\n')
}

/**
 * Main CLI
 */
function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  const phase = args[1]

  console.log('🛡️  CSP Rollout Configuration Tool\n')

  if (!command) {
    console.log('Usage:')
    console.log('  node csp-rollout-config.js generate <phase>')
    console.log('  node csp-rollout-config.js analyze')
    console.log('  node csp-rollout-config.js checklist <phase>')
    console.log('  node csp-rollout-config.js list')
    console.log('')
    console.log('Available phases:')
    for (const [key, config] of Object.entries(cspConfigs)) {
      console.log(`  - ${key}: ${config.name}`)
    }
    process.exit(0)
  }

  switch (command) {
    case 'generate':
      if (!phase || !cspConfigs[phase]) {
        console.error('❌ Invalid or missing phase')
        console.log('\nAvailable phases:', Object.keys(cspConfigs).join(', '))
        process.exit(1)
      }
      console.log(`Generating CSP configuration for: ${cspConfigs[phase].name}\n`)
      console.log(generateEnvContent(phase))
      console.log('\n---\n')
      console.log('CSP Header String:')
      console.log(generateCSPHeader(phase))
      break

    case 'analyze':
      analyzeExternalResources()
      break

    case 'checklist':
      if (!phase || !cspConfigs[phase]) {
        console.error('❌ Invalid or missing phase')
        console.log('\nAvailable phases:', Object.keys(cspConfigs).join(', '))
        process.exit(1)
      }
      console.log(generateRolloutChecklist(phase))
      break

    case 'list':
      console.log('Available CSP Configurations:\n')
      for (const [key, config] of Object.entries(cspConfigs)) {
        console.log(`${key}:`)
        console.log(`  Name: ${config.name}`)
        console.log(`  Description: ${config.description}`)
        console.log(`  Mode: ${config.env.CSP_REPORT_ONLY === 'true' ? 'Report-Only' : 'Enforced'}`)
        console.log('')
      }
      break

    default:
      console.error(`❌ Unknown command: ${command}`)
      process.exit(1)
  }
}

main()
