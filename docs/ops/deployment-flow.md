# Project Valine - Deployment Flow

Visual guide to the deployment architecture and process.

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Project Valine Deployment                    │
└─────────────────────────────────────────────────────────────────┘

                           Development Flow
                           ===============

┌──────────────┐
│  Developer   │
│   Machine    │
└──────┬───────┘
       │
       │ 1. Database Setup
       ▼
┌─────────────────┐
│  ./scripts/     │──────────────┐
│  deployment/    │              │
│  setup-         │              ▼
│  database.sh    │     ┌────────────────┐
└─────────────────┘     │   PostgreSQL   │
       │                │   /MySQL DB    │
       │ 2. Deploy      └────────────────┘
       │    Backend              │
       ▼                         │
┌─────────────────┐              │
│  ./scripts/     │              │
│  deployment/    │              │
│  deploy-        │              │
│  backend.sh     │              │
└─────────────────┘              │
       │                         │
       │ 3. Creates              │
       ▼                         │
┌─────────────────────────────┐  │
│    AWS Infrastructure       │  │
│  ┌─────────────────────┐   │  │
│  │   API Gateway       │   │  │
│  │   (HTTP API)        │   │  │
│  └──────────┬──────────┘   │  │
│             │               │  │
│  ┌──────────▼──────────┐   │  │
│  │  Lambda Functions   │───┼──┘ DATABASE_URL
│  │  - createUser       │   │
│  │  - getUser          │   │
│  │  - createPost       │   │
│  │  - listPosts        │   │
│  │  - connections      │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │  CloudWatch Logs    │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
       │
       │ 4. Returns API URL
       ▼
┌─────────────────┐
│  API_BASE URL   │
│  Saved by User  │
└─────────────────┘
       │
       │ 5. Test Endpoints
       ▼
┌─────────────────┐
│  ./scripts/     │
│  deployment/    │
│  test-          │
│  endpoints.sh   │
└─────────────────┘
       │
       │ 6. Configure Frontend
       ▼
┌─────────────────┐
│  ./scripts/     │
│  deployment/    │
│  configure-     │
│  frontend.sh    │
└─────────────────┘
       │
       │ 7. Creates .env
       ▼
┌─────────────────┐
│   .env file     │
│   VITE_API_BASE │
└─────────────────┘
       │
       │ 8. Build & Run
       ▼
┌─────────────────┐
│  Frontend App   │
│  React + Vite   │
│  localhost:5173 │
└─────────────────┘
       │
       └──────────────────────┐
                              │
       ┌──────────────────────┘
       │
       │ API Calls
       ▼
┌─────────────────────────────┐
│   API Gateway (AWS)         │
└─────────────────────────────┘


                         Production Flow
                         ===============

┌──────────────┐
│   GitHub     │
│  Repository  │
└──────┬───────┘
       │
       │ git push main
       ▼
┌─────────────────────────────┐
│   GitHub Actions            │
│  ┌─────────────────────┐   │
│  │ backend-deploy.yml  │   │
│  └──────────┬──────────┘   │
│             │               │
│  ┌──────────▼──────────┐   │
│  │ client-deploy.yml   │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
       │              │
       │              │
       ▼              ▼
┌─────────────┐  ┌─────────────┐
│   Backend   │  │  Frontend   │
│     AWS     │  │   S3 +      │
│   Lambda    │  │ CloudFront  │
└─────────────┘  └─────────────┘


                        Data Flow
                        =========

┌─────────────┐
│   Browser   │
│   (User)    │
└──────┬──────┘
       │
       │ HTTPS Request
       │ (e.g., GET /users/johndoe)
       ▼
┌────────────────────────────┐
│   CloudFront (CDN)         │
│   Frontend: React App      │
└──────┬─────────────────────┘
       │
       │ API Call
       │ fetch(VITE_API_BASE + '/users/johndoe')
       ▼
┌────────────────────────────┐
│   API Gateway              │
│   Route: GET /users/{user} │
└──────┬─────────────────────┘
       │
       │ Invoke
       ▼
┌────────────────────────────┐
│   Lambda Function          │
│   Handler: users.getUser   │
│                            │
│   1. Parse event           │
│   2. Get Prisma client     │
│   3. Query database        │
│   4. Return JSON           │
└──────┬─────────────────────┘
       │
       │ SQL Query
       │ (via Prisma)
       ▼
┌────────────────────────────┐
│   PostgreSQL Database      │
│   Table: users             │
│                            │
│   SELECT * FROM users      │
│   WHERE username = 'john'  │
└──────┬─────────────────────┘
       │
       │ Result
       ▼
┌────────────────────────────┐
│   Lambda Function          │
│   Returns:                 │
│   {                        │
│     "id": "uuid",          │
│     "username": "john",    │
│     "displayName": "John", │
│     ...                    │
│   }                        │
└──────┬─────────────────────┘
       │
       │ HTTP 200 + JSON
       ▼
┌────────────────────────────┐
│   Browser (User)           │
│   Renders profile page     │
└────────────────────────────┘
```

## Deployment Stages

### Stage 1: Local Development

```
Developer Machine
├── Database: SQLite (file:./dev.db)
├── Backend: Serverless Offline (localhost:3001)
└── Frontend: Vite Dev Server (localhost:5173)
```

### Stage 2: Development (AWS)

```
AWS Development Environment
├── Database: RDS PostgreSQL (dev instance)
├── Backend: Lambda Functions (dev stage)
├── API Gateway: https://api-id.execute-api.us-west-2.amazonaws.com/dev
└── Frontend: S3 + CloudFront (dev bucket)
```

### Stage 3: Staging (AWS)

```
AWS Staging Environment
├── Database: RDS PostgreSQL (staging instance)
├── Backend: Lambda Functions (staging stage)
├── API Gateway: https://api-id.execute-api.us-west-2.amazonaws.com/staging
└── Frontend: S3 + CloudFront (staging bucket)
```

### Stage 4: Production (AWS)

```
AWS Production Environment
├── Database: RDS PostgreSQL (prod instance, multi-AZ)
├── Backend: Lambda Functions (prod stage, provisioned concurrency)
├── API Gateway: https://api-id.execute-api.us-west-2.amazonaws.com/prod
└── Frontend: S3 + CloudFront (prod bucket, global distribution)
```

## Deployment Scripts Flow

```
setup-database.sh
    ├── Check DATABASE_URL
    ├── npm install (in api/)
    ├── npx prisma generate
    └── npx prisma migrate deploy
         └── Creates tables in database

deploy-backend.sh
    ├── Check DATABASE_URL
    ├── npm install (in serverless/)
    ├── Generate Prisma Client
    └── npx serverless deploy
         ├── Package Lambda functions
         ├── Create/Update CloudFormation stack
         ├── Deploy Lambda functions
         ├── Configure API Gateway
         └── Return API Gateway URL

test-endpoints.sh
    ├── Check API_BASE
    ├── Test GET /health
    ├── Test POST /users (create user)
    ├── Test GET /users/{username}
    ├── Test POST /posts (create post)
    └── Test GET /posts (list posts)

configure-frontend.sh
    ├── Get API Gateway URL
    ├── Create/Update .env file
    │    └── VITE_API_BASE=https://...
    ├── Update .env.example
    └── Test API connectivity
```

## CI/CD Pipeline

```
GitHub Push (main branch)
    │
    ├─── Backend Deploy Workflow
    │    ├── Checkout code
    │    ├── Setup Node.js
    │    ├── Configure AWS credentials (OIDC)
    │    ├── Install Serverless
    │    └── Deploy to AWS
    │         └── Lambda + API Gateway updated
    │
    └─── Client Deploy Workflow
         ├── Checkout code
         ├── Setup Node.js
         ├── Configure AWS credentials (OIDC)
         ├── Build frontend (npm run build)
         │    └── Uses VITE_API_BASE from GitHub secret
         ├── Upload to S3
         └── Invalidate CloudFront cache
              └── Frontend updated globally
```

## Security Flow

```
User Request
    │
    ▼
┌─────────────────┐
│   CloudFront    │ ◄─── HTTPS only
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Gateway    │ ◄─── CORS validation
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Lambda      │ ◄─── Input validation
│                 │      (in handlers)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Prisma      │ ◄─── SQL injection protection
│                 │      (parameterized queries)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Database      │ ◄─── SSL connection
│                 │      VPC isolation
└─────────────────┘
```

## Monitoring Flow

```
Lambda Execution
    │
    ├─── Logs ──────────────► CloudWatch Logs
    │                          - Function logs
    │                          - Error traces
    │                          - Custom metrics
    │
    ├─── Metrics ──────────► CloudWatch Metrics
    │                          - Invocations
    │                          - Duration
    │                          - Errors
    │                          - Throttles
    │
    └─── Traces ───────────► X-Ray (optional)
                               - Request tracing
                               - Service map
                               - Performance bottlenecks
```

## Rollback Flow

```
Issue Detected
    │
    ▼
┌─────────────────────────┐
│ Rollback Decision       │
└────────┬────────────────┘
         │
         ├─── Backend Rollback
         │    ├── git revert (or checkout previous commit)
         │    ├── npx serverless deploy
         │    └── Lambda functions restored
         │
         └─── Frontend Rollback
              ├── git revert
              ├── npm run build
              ├── Upload to S3
              └── Invalidate CloudFront
```

## Summary

### Key Components

1. **Database** - PostgreSQL/MySQL for persistent data
2. **Backend** - Lambda functions for API logic
3. **API Gateway** - HTTP API for routing requests
4. **Frontend** - React app served from S3/CloudFront
5. **Deployment Scripts** - Automated deployment workflow

### Deployment Time

- Initial setup: 1-2 hours
- Subsequent deployments: 5-10 minutes
- Automated CI/CD: 3-5 minutes

### Cost (Development)

- Lambda: ~$0 (within free tier for low traffic)
- API Gateway: ~$0 (within free tier)
- RDS t3.micro: ~$15/month
- S3: ~$1/month
- CloudFront: ~$1/month
- **Total**: ~$17/month for development

---

For detailed instructions, see:
- [DEPLOYMENT.md](deployment/overview.md) - Complete guide
- [QUICK_START.md](quickstart/README.md) - 5-minute guide
- [API_REFERENCE.md](api/reference.md) - API documentation

Last Updated: October 29, 2025
