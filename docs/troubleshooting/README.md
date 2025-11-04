# Troubleshooting Guide

Common issues and solutions for Project Valine deployment and operation.

## Table of Contents

- [Database Issues](#database-issues)
- [Backend Deployment Issues](#backend-deployment-issues)
- [Lambda Function Issues](#lambda-function-issues)
- [Frontend Issues](#frontend-issues)
- [Network & CORS Issues](#network--cors-issues)
- [Performance Issues](#performance-issues)
- [Security Issues](#security-issues)

---

## Database Issues

### Cannot connect to database

**Symptoms:**
- Error: "Can't reach database server"
- Lambda functions timeout
- Prisma connection errors

**Solutions:**

1. **Verify DATABASE_URL format**
   ```bash
   echo $DATABASE_URL
   # Should be: postgresql://username:password@host:port/database
   ```

   Valid formats:
   ```bash
   # PostgreSQL
   postgresql://user:pass@localhost:5432/dbname
   
   # PostgreSQL with SSL
   postgresql://user:pass@host:5432/dbname?sslmode=require
   
   # MySQL
   mysql://user:pass@localhost:3306/dbname
   
   # SQLite (dev only)
   file:./dev.db
   ```

2. **Test database connectivity**
   ```bash
   # PostgreSQL
   psql "$DATABASE_URL" -c "SELECT 1;"
   
   # MySQL
   mysql -h host -u user -ppass dbname -e "SELECT 1;"
   ```

3. **Check firewall/security groups**
   - For AWS RDS: Add Lambda IP ranges to security group
   - For VPC: Ensure Lambda is in correct VPC and subnet
   - Check network ACLs and route tables

4. **Verify database exists**
   ```bash
   cd api
   npx prisma db pull
   ```

5. **Check connection limits**
   - PostgreSQL: Check `max_connections` setting
   - Consider connection pooling (Prisma Data Proxy)

---

### Prisma Client not found

**Symptoms:**
- Error: "Cannot find module '@prisma/client'"
- Error: "PrismaClient is not a constructor"

**Solutions:**

1. **Generate Prisma Client**
   ```bash
   cd api
   npx prisma generate
   ```

2. **Install dependencies**
   ```bash
   cd api
   npm install
   cd ../serverless
   npm install
   ```

3. **Regenerate and redeploy**
   ```bash
   cd api
   npx prisma generate
   cd ../serverless
   npx serverless deploy
   ```

4. **Check Prisma schema location**
   - Ensure `schema.prisma` is in `api/prisma/`
   - Verify generator configuration in schema

---

### Migration failed

**Symptoms:**
- Error: "Migration failed to apply"
- Database schema mismatch
- Missing tables

**Solutions:**

1. **Check migration status**
   ```bash
   cd api
   npx prisma migrate status
   ```

2. **Apply migrations**
   ```bash
   # Development
   npx prisma migrate dev
   
   # Production
   npx prisma migrate deploy
   ```

3. **Reset database (development only)**
   ```bash
   npx prisma migrate reset
   ```

4. **Force push schema (use with caution)**
   ```bash
   npx prisma db push --force-reset
   ```

---

## Backend Deployment Issues

### Serverless deployment failed

**Symptoms:**
- Error during `serverless deploy`
- AWS credentials error
- CloudFormation stack creation failed

**Solutions:**

1. **Verify AWS credentials**
   ```bash
   aws sts get-caller-identity
   ```

2. **Configure AWS CLI**
   ```bash
   aws configure
   # Enter AWS Access Key ID, Secret Access Key, Region
   ```

3. **Check IAM permissions**
   Required permissions:
   - Lambda: CreateFunction, UpdateFunctionCode
   - API Gateway: CreateApi, CreateRoute
   - CloudWatch: CreateLogGroup
   - IAM: CreateRole, AttachRolePolicy

4. **Check serverless version**
   ```bash
   serverless --version
   # Should be 3.x
   npm install -g serverless@3
   ```

5. **Clean and redeploy**
   ```bash
   cd serverless
   rm -rf .serverless node_modules
   npm install
   npx serverless deploy --verbose
   ```

6. **Check CloudFormation logs**
   - Go to AWS Console → CloudFormation
   - Find your stack (e.g., `pv-api-dev`)
   - Check Events tab for errors

---

### Environment variables not set

**Symptoms:**
- Lambda functions can't access DATABASE_URL
- Error: "DATABASE_URL is not defined"

**Solutions:**

1. **Set in serverless.yml**
   ```yaml
   provider:
     environment:
       DATABASE_URL: ${env:DATABASE_URL}
   ```

2. **Export before deployment**
   ```bash
   export DATABASE_URL="postgresql://user:pass@host:5432/db"
   npx serverless deploy
   ```

3. **Use AWS Systems Manager Parameter Store**
   ```bash
   aws ssm put-parameter \
     --name "/valine/dev/DATABASE_URL" \
     --value "postgresql://..." \
     --type "SecureString"
   ```
   
   Then update serverless.yml:
   ```yaml
   provider:
     environment:
       DATABASE_URL: ${ssm:/valine/dev/DATABASE_URL}
   ```

4. **Set via AWS Lambda console**
   - Go to Lambda function → Configuration → Environment variables
   - Add/update DATABASE_URL

---

## Lambda Function Issues

### Function timeout

**Symptoms:**
- Error: "Task timed out after 6.00 seconds"
- Slow API responses
- CloudWatch shows timeout errors

**Solutions:**

1. **Increase timeout**
   ```yaml
   # serverless.yml
   provider:
     timeout: 30  # seconds (default is 6)
   ```

2. **Optimize database queries**
   - Add indexes to frequently queried columns
   - Use `select` to limit returned fields
   - Consider pagination for large result sets

3. **Use Prisma Data Proxy**
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
     directUrl = env("DIRECT_DATABASE_URL")
   }
   ```

4. **Check database connection latency**
   - Consider using RDS Proxy
   - Move Lambda to same region as database

---

### Cold start issues

**Symptoms:**
- First request takes >3 seconds
- Intermittent slow responses
- "Request timeout" errors

**Solutions:**

1. **Use provisioned concurrency**
   ```yaml
   functions:
     getUser:
       provisionedConcurrency: 2
   ```

2. **Minimize dependencies**
   - Remove unused npm packages
   - Use Lambda layers for large dependencies

3. **Keep Lambdas warm**
   - Use CloudWatch Events to ping endpoints every 5 minutes
   ```yaml
   events:
     - schedule: rate(5 minutes)
   ```

4. **Optimize package size**
   ```yaml
   # serverless.yml
   package:
     patterns:
       - '!node_modules/**'
       - 'node_modules/@prisma/**'
   ```

---

### Function errors in CloudWatch

**Symptoms:**
- 500 errors in API responses
- CloudWatch logs show exceptions
- Function failures

**Solutions:**

1. **View logs**
   ```bash
   cd serverless
   npx serverless logs -f getUser --stage dev --tail
   ```

2. **Check specific error**
   ```bash
   # View last 100 lines
   npx serverless logs -f getUser --stage dev --count 100
   ```

3. **Enable detailed logging**
   ```javascript
   // In handler
   console.log('Event:', JSON.stringify(event));
   console.log('Context:', JSON.stringify(context));
   ```

4. **Set up error alerts**
   ```yaml
   # serverless.yml
   custom:
     alerts:
       - functionErrors
   ```

---

## Frontend Issues

### Frontend shows "Loading..." forever

**Symptoms:**
- Page stuck on loading state
- Network requests pending
- No data displayed

**Solutions:**

1. **Check browser console**
   - Press F12 → Console tab
   - Look for errors

2. **Verify API_BASE URL**
   ```bash
   cat .env
   # Should show: VITE_API_BASE=https://...
   ```

3. **Test API directly**
   ```bash
   curl $VITE_API_BASE/health
   ```

4. **Restart dev server**
   ```bash
   # Stop with Ctrl+C
   npm run dev
   ```

5. **Clear browser cache**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - Clear site data in DevTools

6. **Check Network tab**
   - F12 → Network tab
   - Look for failed requests
   - Check response status codes

---

### Environment variables not loading

**Symptoms:**
- `import.meta.env.VITE_API_BASE` is undefined
- API calls go to wrong URL

**Solutions:**

1. **Verify .env file exists**
   ```bash
   ls -la .env
   cat .env
   ```

2. **Check variable prefix**
   - Vite requires `VITE_` prefix for client-side variables
   - Correct: `VITE_API_BASE`
   - Wrong: `API_BASE`

3. **Restart dev server**
   - Environment changes require restart
   ```bash
   npm run dev
   ```

4. **Check .env in correct location**
   - Must be in project root
   - Not in subdirectories

5. **Use import.meta.env**
   ```javascript
   // Correct
   const apiBase = import.meta.env.VITE_API_BASE;
   
   // Wrong (won't work in browser)
   const apiBase = process.env.VITE_API_BASE;
   ```

---

## Network & CORS Issues

### CORS errors

**Symptoms:**
- Error: "has been blocked by CORS policy"
- Error: "No 'Access-Control-Allow-Origin' header"
- Preflight OPTIONS requests failing

**Solutions:**

1. **Verify CORS headers in handlers**
   ```javascript
   // All handlers should include:
   headers: {
     'Access-Control-Allow-Origin': '*',  // Or your domain
     'Access-Control-Allow-Credentials': true,
   }
   ```

2. **Enable CORS in serverless.yml**
   ```yaml
   provider:
     httpApi:
       cors: true
   ```

3. **Handle OPTIONS requests**
   ```javascript
   if (event.requestContext.http.method === 'OPTIONS') {
     return {
       statusCode: 200,
       headers: {
         'Access-Control-Allow-Origin': '*',
         'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
         'Access-Control-Allow-Headers': 'Content-Type',
       },
       body: '',
     };
   }
   ```

4. **For production, restrict origin**
   ```javascript
   'Access-Control-Allow-Origin': 'https://your-domain.com'
   ```

---

### API Gateway returns 403

**Symptoms:**
- All API calls return 403 Forbidden
- "Missing Authentication Token" error

**Solutions:**

1. **Check endpoint path**
   - Ensure path matches serverless.yml
   - Check for typos in URL

2. **Verify deployment**
   ```bash
   cd serverless
   npx serverless info --stage dev
   ```

3. **Check API Gateway in AWS Console**
   - Go to API Gateway service
   - Find your API
   - Check Routes and Integrations

4. **Redeploy**
   ```bash
   npx serverless deploy --stage dev
   ```

---

## Performance Issues

### Slow API responses

**Symptoms:**
- Requests take >5 seconds
- User complaints about performance
- CloudWatch shows high duration

**Solutions:**

1. **Add database indexes**
   ```prisma
   model Post {
     // ...
     @@index([authorId])
     @@index([createdAt])
   }
   ```

2. **Use pagination**
   ```javascript
   // Limit results
   const posts = await prisma.post.findMany({
     take: 20,
     skip: page * 20,
   });
   ```

3. **Optimize queries**
   ```javascript
   // Only select needed fields
   const user = await prisma.user.findUnique({
     select: { id: true, username: true, avatar: true },
   });
   ```

4. **Enable connection pooling**
   - Use Prisma Data Proxy
   - Or RDS Proxy

5. **Cache frequently accessed data**
   - Use ElastiCache (Redis)
   - Or Lambda@Edge with CloudFront

---

### High database connection count

**Symptoms:**
- Error: "too many connections"
- Database refuses new connections
- Slow queries

**Solutions:**

1. **Use connection pooling**
   - Prisma Data Proxy
   - RDS Proxy
   - PgBouncer (PostgreSQL)

2. **Limit Prisma connections**
   ```
   DATABASE_URL="postgresql://...?connection_limit=1"
   ```

3. **Close connections properly**
   ```javascript
   // In handler
   try {
     const prisma = getPrisma();
     // ... do work
   } finally {
     await prisma.$disconnect();
   }
   ```

4. **Monitor connections**
   ```sql
   -- PostgreSQL
   SELECT count(*) FROM pg_stat_activity;
   ```

---

## Security Issues

### Exposed secrets

**Symptoms:**
- DATABASE_URL in git history
- API keys in code
- Credentials in logs

**Solutions:**

1. **Remove from git history**
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   ```

2. **Use environment variables**
   - Never hardcode secrets
   - Use AWS Secrets Manager or SSM

3. **Update secrets**
   - Rotate compromised credentials immediately
   - Update in AWS/database

4. **Add to .gitignore**
   ```
   .env
   .env.local
   .env.*.local
   ```

---

### SQL injection attempts

**Symptoms:**
- Suspicious database queries in logs
- Unexpected SQL errors
- Security scanner alerts

**Solutions:**

1. **Verify Prisma usage**
   - Prisma automatically prevents SQL injection
   - Never use raw SQL with user input

2. **If using raw SQL, use parameterized queries**
   ```javascript
   // Safe
   await prisma.$queryRaw`SELECT * FROM users WHERE id = ${userId}`;
   
   // Unsafe (don't do this)
   await prisma.$queryRaw(`SELECT * FROM users WHERE id = ${userId}`);
   ```

3. **Validate input**
   ```javascript
   if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
     return error('Invalid username format', 400);
   }
   ```

---

## Getting Help

If you can't resolve an issue:

1. **Check CloudWatch Logs** - Most detailed error information
2. **Review DEPLOYMENT.md** - Comprehensive deployment guide
3. **Check API_REFERENCE.md** - API endpoint documentation
4. **Search GitHub Issues** - Someone may have had the same problem
5. **Create a GitHub Issue** - Include:
   - Error message (full stack trace)
   - Steps to reproduce
   - Environment (AWS region, Node version, etc.)
   - Relevant logs

## Useful Commands

```bash
# View Lambda logs
npx serverless logs -f functionName --stage dev --tail

# Check deployment status
npx serverless info --stage dev

# Invoke function locally
npx serverless invoke local -f functionName

# View database schema
cd api && npx prisma studio

# Test API endpoint
curl -v https://api-url/endpoint

# Check AWS credentials
aws sts get-caller-identity

# View CloudFormation stack
aws cloudformation describe-stacks --stack-name pv-api-dev

# List Lambda functions
aws lambda list-functions --region us-west-2
```

---

Last Updated: October 29, 2025
