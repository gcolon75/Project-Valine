#!/usr/bin/env node
/**
 * Cleanup script for old audit logs
 */

import { PrismaClient } from '@prisma/client'
import { cleanupOldAuditLogs } from '../src/utils/auditLog.js'

const prisma = new PrismaClient()
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const retentionDaysArg = args.find(arg => arg.startsWith('--retention-days='))
const retentionDays = retentionDaysArg 
  ? parseInt(retentionDaysArg.split('=')[1]) 
  : parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '90')

async function main() {
  console.log('🧹 Audit Log Cleanup Script')
  console.log(`Retention period: ${retentionDays} days`)
  console.log(`Dry run: ${isDryRun}`)
  
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
  
  const count = await prisma.auditLog.count({
    where: { createdAt: { lt: cutoffDate } }
  })
  
  console.log(`Found ${count} logs to cleanup`)
  
  if (count === 0 || isDryRun) return
  
  const deleted = await cleanupOldAuditLogs(retentionDays)
  console.log(`✅ Deleted ${deleted} audit logs`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1) })
