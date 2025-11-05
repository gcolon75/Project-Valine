/**
 * Migration script: Convert legacy socialLinks JSON to normalized profile_links table
 * 
 * This script is:
 * - Idempotent: Safe to run multiple times
 * - Non-destructive: Does not delete existing data
 * - Backward compatible: Preserves original socialLinks JSON field
 * 
 * Usage:
 *   node scripts/migrate-social-links.js [--dry-run]
 * 
 * Environment variables:
 *   DATABASE_URL - Required: PostgreSQL connection string
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Map of legacy social link keys to profile link types
const TYPE_MAPPING = {
  website: 'website',
  imdb: 'imdb',
  showreel: 'showreel',
  linkedin: 'other',
  instagram: 'other',
  twitter: 'other',
  facebook: 'other',
  youtube: 'other'
}

// Label mapping for better display names
const LABEL_MAPPING = {
  website: 'Website',
  imdb: 'IMDb Profile',
  showreel: 'Showreel',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  twitter: 'Twitter',
  facebook: 'Facebook',
  youtube: 'YouTube'
}

/**
 * Migrate a single profile's socialLinks to profile_links
 */
async function migrateProfile(profile, dryRun = false) {
  const { id: profileId, userId, socialLinks } = profile
  
  if (!socialLinks || typeof socialLinks !== 'object') {
    return { skipped: true, reason: 'No socialLinks data' }
  }
  
  // Parse socialLinks if it's a JSON string
  let linksData = socialLinks
  if (typeof socialLinks === 'string') {
    try {
      linksData = JSON.parse(socialLinks)
    } catch (e) {
      return { skipped: true, reason: 'Invalid JSON in socialLinks' }
    }
  }
  
  /**
   * Lightweight URL validation helper
   */
  const isValidUrl = (value) => {
    if (!value || typeof value !== 'string') return false
    // Quick check for http/https protocol
    if (!value.startsWith('http://') && !value.startsWith('https://')) return false
    // More thorough check with URL constructor
    try {
      new URL(value)
      return true
    } catch {
      return false
    }
  }
  
  const entries = Object.entries(linksData).filter(([key, value]) => isValidUrl(value))
  
  if (entries.length === 0) {
    return { skipped: true, reason: 'No valid URLs in socialLinks' }
  }
  
  console.log(`  Profile ${userId}: Found ${entries.length} links to migrate`)
  
  if (dryRun) {
    console.log(`    [DRY RUN] Would create ${entries.length} profile links`)
    for (const [key, url] of entries) {
      const type = TYPE_MAPPING[key] || 'other'
      const label = LABEL_MAPPING[key] || key
      console.log(`    - ${label} (${type}): ${url}`)
    }
    return { migrated: entries.length, dryRun: true }
  }
  
  // Check if links already exist for this profile
  const existingLinks = await prisma.profileLink.findMany({
    where: { profileId }
  })
  
  const existingUrls = new Set(existingLinks.map(l => l.url.toLowerCase()))
  
  // Create new profile links
  let created = 0
  let skipped = 0
  
  for (let i = 0; i < entries.length; i++) {
    const [key, url] = entries[i]
    
    // Skip if URL already exists
    if (existingUrls.has(url.toLowerCase())) {
      skipped++
      continue
    }
    
    const type = TYPE_MAPPING[key] || 'other'
    const label = LABEL_MAPPING[key] || key
    
    try {
      await prisma.profileLink.create({
        data: {
          userId,
          profileId,
          label,
          url,
          type,
          position: i
        }
      })
      created++
      console.log(`    ✓ Created: ${label} (${type})`)
    } catch (error) {
      console.error(`    ✗ Failed to create link for ${key}:`, error.message)
    }
  }
  
  return { migrated: created, skipped, total: entries.length }
}

/**
 * Main migration function
 */
async function migrate(dryRun = false) {
  console.log('Starting socialLinks migration...')
  console.log('Mode:', dryRun ? 'DRY RUN' : 'LIVE')
  console.log()
  
  try {
    // Fetch all profiles with socialLinks
    const profiles = await prisma.profile.findMany({
      where: {
        socialLinks: { not: null }
      },
      select: {
        id: true,
        userId: true,
        socialLinks: true
      }
    })
    
    console.log(`Found ${profiles.length} profiles with socialLinks data`)
    console.log()
    
    if (profiles.length === 0) {
      console.log('No profiles to migrate. Exiting.')
      return
    }
    
    let totalMigrated = 0
    let totalSkipped = 0
    let profilesProcessed = 0
    let profilesSkipped = 0
    
    for (const profile of profiles) {
      const result = await migrateProfile(profile, dryRun)
      
      if (result.skipped) {
        profilesSkipped++
        console.log(`  Profile ${profile.userId}: Skipped - ${result.reason}`)
      } else {
        profilesProcessed++
        totalMigrated += result.migrated || 0
        totalSkipped += result.skipped || 0
      }
    }
    
    console.log()
    console.log('Migration Summary:')
    console.log('==================')
    console.log(`Profiles processed: ${profilesProcessed}`)
    console.log(`Profiles skipped: ${profilesSkipped}`)
    console.log(`Links migrated: ${totalMigrated}`)
    if (totalSkipped > 0) {
      console.log(`Links skipped (duplicates): ${totalSkipped}`)
    }
    
    if (dryRun) {
      console.log()
      console.log('This was a DRY RUN. No changes were made.')
      console.log('Run without --dry-run to perform the migration.')
    } else {
      console.log()
      console.log('✓ Migration completed successfully!')
      console.log()
      console.log('Note: Original socialLinks JSON fields are preserved.')
      console.log('You can safely remove them in a future migration if needed.')
    }
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

// Run migration
migrate(dryRun).catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
