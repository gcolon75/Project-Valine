> **ARCHIVED:** 2026-01-05
> **Reason:** Consolidated into canonical documentation
> **See:** [Documentation Index](../README.md) for current docs

---
# Database Provider Comparison for Project Valine

This document helps you choose the right database provider for your deployment stage.

## Quick Recommendation

- **Development/Testing:** ✅ **Supabase Free Tier** (recommended)
- **Production (Small-Medium):** ✅ **Supabase Pro** ($25/month)
- **Production (Large Scale):** Consider **AWS RDS** with connection pooling

---

## Detailed Comparison

### Supabase Free Tier

**Best for:** Development, testing, small projects, proof of concepts

| Feature | Specification |
|---------|--------------|
| **Cost** | **$0/month forever** |
| **Database Size** | 500MB |
| **Bandwidth** | 2GB/month |
| **Connection Pooling** | ✅ Built-in (pgBouncer) |
| **SSL** | ✅ Enabled by default |
| **Backups** | ✅ Automatic (7 days) |
| **Setup Time** | ~5 minutes |
| **Maintenance** | Fully managed |
| **Credit Card** | Not required |

**Pros:**
- ✅ Completely free forever
- ✅ Perfect for serverless (connection pooling included)
- ✅ Instant setup
- ✅ Great for development and testing
- ✅ Easy upgrade path to paid tier
- ✅ Web-based database GUI
- ✅ Real-time subscriptions available

**Cons:**
- ❌ 500MB storage limit on free tier
- ❌ Shared resources (may be slower)
- ❌ 2GB bandwidth limit

**Connection String Format:**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Setup Instructions:**
1. Sign up at https://supabase.com
2. Create new project (2 minutes)
3. Copy connection string from Settings → Database
4. Use pooler URL (port 6543) for Lambda

---

### Supabase Pro

**Best for:** Production applications, small to medium scale

| Feature | Specification |
|---------|--------------|
| **Cost** | **$25/month** |
| **Database Size** | 8GB (expandable) |
| **Bandwidth** | 250GB/month |
| **Connection Pooling** | ✅ Built-in (pgBouncer) |
| **SSL** | ✅ Enabled |
| **Backups** | ✅ Daily (30 days retention) |
| **Support** | Email support |
| **Performance** | Dedicated resources |

**Pros:**
- ✅ Great value for money
- ✅ All features of free tier
- ✅ Much higher limits
- ✅ Dedicated resources (better performance)
- ✅ 30-day backups
- ✅ Point-in-time recovery
- ✅ Email support

**Cons:**
- ❌ More expensive than RDS for very large databases
- ❌ Limited control over PostgreSQL configuration

---

### AWS RDS (db.t3.micro)

**Best for:** Production with specific compliance requirements, very large scale

| Feature | Specification |
|---------|--------------|
| **Cost** | **~$15-20/month minimum** |
| **Database Size** | 20GB (expandable, additional cost) |
| **Storage Cost** | +$0.10/GB/month |
| **Connection Pooling** | ❌ Requires RDS Proxy (~$15/month) |
| **SSL** | ✅ Available (manual setup) |
| **Backups** | ✅ Automated (retention costs extra) |
| **Setup Time** | ~15-30 minutes |
| **Maintenance** | Managed, but requires configuration |
| **Credit Card** | Required immediately |

**Pros:**
- ✅ Full AWS ecosystem integration
- ✅ Complete control over configuration
- ✅ Multiple engine options (PostgreSQL, MySQL, Aurora)
- ✅ Can scale to very large sizes
- ✅ VPC isolation for security
- ✅ Free tier available (750 hours/month for 12 months)

**Cons:**
- ❌ More expensive minimum cost
- ❌ Connection pooling costs extra (~$15/month for RDS Proxy)
- ❌ Complex VPC and security group setup
- ❌ Requires Lambda VPC configuration (cold starts)
- ❌ Manual SSL certificate management
- ❌ More maintenance overhead
- ❌ Free tier only lasts 12 months

**True Monthly Cost Breakdown:**
```
RDS db.t3.micro:           $15.00
Storage 20GB:              $2.00
RDS Proxy (recommended):   $15.00
Backups (beyond 20GB):     $2.00
Data transfer:             $1-5.00
─────────────────────────────────
TOTAL:                     $35-40/month
```

**Connection String Format:**
```
postgresql://username:password@your-rds-endpoint.region.rds.amazonaws.com:5432/dbname
```

**Setup Complexity:**
1. Create RDS instance (10 minutes)
2. Configure security groups
3. Set up RDS Proxy for connection pooling
4. Configure Lambda VPC networking
5. Test connectivity
6. Monitor and maintain

---

### AWS RDS Aurora Serverless

**Best for:** Variable workloads, automatic scaling needed

| Feature | Specification |
|---------|--------------|
| **Cost** | **~$45-100/month** (scales with usage) |
| **Scaling** | Automatic based on load |
| **Connection Pooling** | Built-in Data API |
| **Maintenance** | Fully managed |
| **Performance** | High performance |

**Pros:**
- ✅ Automatic scaling
- ✅ Pay only for what you use
- ✅ High availability
- ✅ Built-in connection management

**Cons:**
- ❌ More expensive than standard RDS
- ❌ Complex pricing model
- ❌ Overkill for small projects
- ❌ Minimum capacity charges even when idle

---

## Cost Comparison Chart

| Provider | Free Tier | Dev Cost | Prod Cost (Small) | Prod Cost (Medium) |
|----------|-----------|----------|-------------------|-------------------|
| **Supabase Free** | ✅ Yes | **$0** | N/A | N/A |
| **Supabase Pro** | ❌ No | **$25** | **$25** | **$25-60** |
| **AWS RDS t3.micro** | ✅ 12 months | **$15-20** | **$35-40** | **$50-100** |
| **AWS Aurora Serverless** | ❌ No | **$45+** | **$60-100** | **$100-200** |

---

## Performance Comparison

### Connection Management (Critical for Serverless)

**Supabase:**
```
✅ Built-in pgBouncer
✅ No additional cost
✅ Perfect for Lambda
✅ 200+ concurrent connections supported
```

**AWS RDS without Proxy:**
```
❌ Limited to ~100 connections
❌ Each Lambda creates new connection
❌ Connection exhaustion common
❌ Cold start issues
```

**AWS RDS with Proxy:**
```
✅ Connection pooling
✅ Better for Lambda
❌ +$15/month cost
⚠️  Adds slight latency
```

### Latency (from us-west-2 Lambda)

| Provider | Average Latency |
|----------|----------------|
| Supabase (us-west-2) | ~20-30ms |
| RDS (same VPC) | ~10-15ms |
| RDS (different AZ) | ~15-25ms |
| Aurora Serverless | ~15-20ms |

---

## Decision Matrix

### Choose Supabase Free if:
- ✅ Building proof of concept
- ✅ Development/testing environment
- ✅ Small user base (<1000 users)
- ✅ Budget is $0
- ✅ Want quick setup
- ✅ Need serverless-friendly database

### Choose Supabase Pro if:
- ✅ Production application
- ✅ Small to medium user base
- ✅ Budget is limited (~$25/month)
- ✅ Want managed solution
- ✅ Don't need custom PostgreSQL configuration
- ✅ Value simplicity over control

### Choose AWS RDS if:
- ✅ Large scale application
- ✅ Specific compliance requirements
- ✅ Need custom PostgreSQL configuration
- ✅ Already heavily invested in AWS
- ✅ Have DevOps resources for management
- ✅ Budget allows $40+/month for database
- ✅ Need VPC isolation

### Choose AWS Aurora if:
- ✅ Highly variable workloads
- ✅ Need automatic scaling
- ✅ High availability critical
- ✅ Large budget ($100+/month)
- ✅ Enterprise-grade requirements

---

## Migration Path

### Starting Small → Growing Large

**Phase 1: Development**
```
Supabase Free ($0)
↓
Test and iterate
```

**Phase 2: Initial Production**
```
Supabase Pro ($25/month)
↓
1,000-10,000 users
```

**Phase 3: Growth**
```
Supabase Pro + Larger Plan ($60-100/month)
OR
AWS RDS with connection pooling ($40+/month)
↓
10,000-100,000 users
```

**Phase 4: Scale**
```
AWS Aurora or Multiple RDS instances
↓
100,000+ users
```

### Easy Migration Between Providers

All providers use PostgreSQL, so migration is straightforward:

```powershell
# Export from current database
pg_dump $SOURCE_DATABASE_URL > backup.sql

# Import to new database
psql $TARGET_DATABASE_URL < backup.sql

# Update DATABASE_URL environment variable
$env:DATABASE_URL = "new-connection-string"

# Redeploy backend
./scripts/deployment/deploy-backend.sh --stage prod
```

---

## Recommendation Summary

### For Project Valine Development (Current Stage):

**Use Supabase Free Tier**

**Reasons:**
1. **$0 cost** - Perfect for initial development
2. **Perfect for serverless** - Built-in connection pooling
3. **5-minute setup** - Start coding immediately
4. **500MB database** - Enough for thousands of test users
5. **Easy upgrade** - One-click upgrade to Pro when needed
6. **No credit card** - No barrier to getting started

**Setup Command:**
```powershell
# After getting Supabase connection string
$env:DATABASE_URL = "postgresql://postgres.[REF]:[PASS]@aws-0-us-west-2.pooler.supabase.com:6543/postgres"
./scripts/deployment/setup-database.sh
./scripts/deployment/deploy-backend.sh --stage dev --region us-west-2
```

### For Production (Later):

Start with **Supabase Pro ($25/month)** and only move to RDS if you:
- Need specific PostgreSQL configurations
- Have compliance requirements
- Have >100,000 active users
- Have DevOps team to manage infrastructure

---

## Additional Resources

### Supabase
- Website: https://supabase.com
- Documentation: https://supabase.com/docs
- Pricing: https://supabase.com/pricing
- Database Guide: https://supabase.com/docs/guides/database

### AWS RDS
- Documentation: https://docs.aws.amazon.com/rds/
- Pricing Calculator: https://calculator.aws/
- Best Practices: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html

### Prisma (Works with Both)
- Documentation: https://www.prisma.io/docs
- Database Connectors: https://www.prisma.io/docs/concepts/database-connectors

---

**Last Updated:** October 30, 2025  
**For:** Project Valine AWS Deployment
