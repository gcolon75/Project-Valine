# Architecture Overview

This document explains the architecture of Project Valine, including component responsibilities, request flow, and where to look when exploring the codebase.

For complete architectural details, see the **[Project Bible](../PROJECT_BIBLE.md#complete-architecture)**.

## Component Overview

### Frontend SPA (`src/`)

**Purpose:** React single-page application providing the user interface

**Key Directories:**
- `src/components/` - Reusable UI components
  - `ui/` - Base primitives (Button, Input, Card)
  - `layout/` - Layout components (Header, Footer, Sidebar)
  - `features/` - Feature-specific components
- `src/pages/` - Page components mapped to routes
- `src/routes/` - Route definitions and protection logic
- `src/services/` - API service layer (communicates with backend)
- `src/contexts/` - React Context providers for state management
- `src/hooks/` - Custom React hooks
- `src/utils/` - Utility functions and helpers

**Build Tool:** Vite 5 with React 18
**Styling:** Tailwind CSS 3
**Routing:** React Router v6

See the [Frontend Build and Deploy Guide](frontend-build-and-deploy.md) for build details.

### Backend API (`serverless/`)

**Purpose:** Serverless REST API providing business logic and data access

**Location:** `/serverless` directory (CANONICAL for production)

**Key Features:**
- Express-style routing via `serverless-http`
- Prisma ORM for database access
- JWT authentication with HttpOnly cookies
- Rate limiting and CSRF protection
- Deployed as AWS Lambda functions

**Key Files:**
- `serverless/handler.js` - Main Lambda handler entry point
- `serverless/src/api/` - API route handlers
- `serverless/src/middleware/` - Authentication, rate limiting, validation
- `serverless/serverless.yml` - Serverless Framework configuration

**Deployment:** Serverless Framework v3 → AWS Lambda + API Gateway

See the [Backend Build and Deploy Guide](backend-build-and-deploy.md) for deployment details.

### Database Schema/Migrations (`api/prisma/`)

**Purpose:** Database schema definition and migration management

**Key Files:**
- `api/prisma/schema.prisma` - Database schema (single source of truth)
- `api/prisma/migrations/` - Migration history with rollback scripts

**ORM:** Prisma 5.x connects to PostgreSQL (AWS RDS)

**Migration Workflow:**
```powershell
# Generate Prisma client after schema changes
cd api
npx prisma generate

# Create a new migration (development)
npx prisma migrate dev --name description_of_change

# Apply migrations (production)
npx prisma migrate deploy
```

See the [Project Bible - Database Schema Reference](../PROJECT_BIBLE.md#database-schema-reference) for complete schema documentation.

### Infrastructure (`infra/`)

**Purpose:** Infrastructure-as-code and configuration

**Key Components:**
- `infra/cloudfront/functions/spa-rewrite.js` - CloudFront Function for SPA routing
  - Rewrites extension-less paths (e.g., `/join`) to `/index.html`
  - Preserves API requests (`/api/*`) and asset requests (`/assets/*`)
  - See [CloudFront SPA Migration Status](../cloudfront-spa-migration-status.md)
- `infra/waf/` - Web Application Firewall configuration
- `infra/serverless.yml` - Presign function for S3 uploads

**CloudFront + S3 Architecture:**
- Static assets served from S3 bucket
- CloudFront CDN for global edge caching
- CloudFront Function handles SPA client-side routing

### Orchestrator (`orchestrator/`)

**Purpose:** Discord bot for deployment automation and diagnostics

**Technology:** Python 3.11, AWS SAM (Serverless Application Model)

**Key Features:**
- Deployment agent (`/deploy-client`, `/deploy-backend`)
- Diagnostics agent (`/diagnose`, `/verify-latest`)
- Triage agent (`/triage <issue-number>`)
- Status reporter (`/status`, `/status-digest`)

**State Management:** DynamoDB with automatic TTL cleanup

**Deployment:** AWS SAM → Lambda + API Gateway + DynamoDB

See the [Project Bible - Agent Instructions](../PROJECT_BIBLE.md#agent-instructions--workflows) for complete documentation.

## Request Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        User / Browser                             │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTPS
                             ▼
           ┌─────────────────────────────────────────┐
           │      AWS CloudFront (CDN)               │
           │  • Global edge locations                │
           │  • SPA routing via CloudFront Function  │
           │  • Static asset caching                 │
           │  • WAF protection                       │
           └──────────┬──────────────┬───────────────┘
                      │              │
         Static Files │              │ API Requests
                      ▼              ▼
        ┌──────────────────┐   ┌─────────────────────────┐
        │   S3 Bucket      │   │   API Gateway (REST)    │
        │  (Frontend)      │   │   • Request validation  │
        │                  │   │   • Throttling          │
        │  • index.html    │   │   • CORS                │
        │  • /assets/*.js  │   └──────────┬──────────────┘
        │  • /assets/*.css │              │ Invoke
        └──────────────────┘              ▼
                              ┌──────────────────────────────┐
                              │   AWS Lambda Functions       │
                              │   (Node.js 20.x)            │
                              │                              │
                              │  • Authentication           │
                              │  • Business logic           │
                              │  • Rate limiting            │
                              │  • CSRF protection          │
                              └──────────┬──────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ▼                    ▼                    ▼
          ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐
          │  Amazon RDS      │  │  Amazon S3   │  │  DynamoDB    │
          │  (PostgreSQL)    │  │  (Media)     │  │ (Bot State)  │
          │                  │  │              │  │              │
          │  • Users         │  │  • Uploads   │  │  • Sessions  │
          │  • Posts         │  │  • Avatars   │  │              │
          │  • Profiles      │  │  • Videos    │  │              │
          └──────────────────┘  └──────────────┘  └──────────────┘
```

### Request Flow: User Loads `/join` Page

1. **Browser** → HTTPS request to CloudFront
2. **CloudFront Function** → Rewrites `/join` → `/index.html`
3. **CloudFront** → Fetches `/index.html` from S3 (or serves from edge cache)
4. **Browser** → Receives HTML, loads JS/CSS assets from `/assets/*`
5. **React Router** → Client-side routing displays Join page component
6. **Services Layer** → API calls to API Gateway when user interacts

### Request Flow: User Creates a Post

1. **Frontend** → POST request to `/api/posts` with JWT token
2. **API Gateway** → Validates request, invokes Lambda function
3. **Lambda** → Validates JWT, checks rate limits, validates input
4. **Prisma** → INSERT query to PostgreSQL
5. **Lambda** → Returns created post JSON
6. **Frontend** → Updates UI with new post

## Where to Look First

When exploring the codebase or debugging issues, start here:

### Frontend Issues
- **Routing problems:** Check `src/routes/index.jsx`
- **API integration:** Review `src/services/` (e.g., `authService.js`, `profileService.js`)
- **State management:** Check `src/contexts/` (e.g., `AuthContext.jsx`)
- **UI components:** Browse `src/components/ui/` and `src/components/features/`
- **Build issues:** Check `vite.config.js`, `scripts/prebuild.js`, `scripts/postbuild-validate.js`

### Backend Issues
- **API endpoints:** Check `serverless/src/api/`
- **Authentication:** Review `serverless/src/middleware/auth.js`
- **Database queries:** Check Prisma client usage in API handlers
- **Configuration:** Review `serverless/serverless.yml`

### Database Issues
- **Schema:** Check `api/prisma/schema.prisma`
- **Migrations:** Review `api/prisma/migrations/`
- **Connection:** Verify `DATABASE_URL` environment variable

### Deployment Issues
- **Frontend:** See [Frontend Build and Deploy](frontend-build-and-deploy.md)
- **Backend:** See [Backend Build and Deploy](backend-build-and-deploy.md)
- **CloudFront/SPA routing:** See [CloudFront SPA Migration Status](../cloudfront-spa-migration-status.md)
- **White screen issues:** See [White Screen Runbook](../white-screen-runbook.md)

## Technology Stack Summary

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, Vite 5, Tailwind CSS 3, React Router v6 |
| **Backend** | Node.js 20.x, Serverless Framework 3, Express-style routing |
| **Database** | PostgreSQL (RDS), Prisma ORM 5.x |
| **Storage** | Amazon S3 (static + media) |
| **CDN** | Amazon CloudFront with CloudFront Functions |
| **API** | AWS API Gateway (REST) |
| **Compute** | AWS Lambda (serverless functions) |
| **Orchestrator** | Python 3.11, AWS SAM, DynamoDB |
| **CI/CD** | GitHub Actions, AWS OIDC authentication |

## Next Steps

Now that you understand the architecture:

1. **[Build and Run Locally](build-and-run-locally.md)** - Set up your dev environment
2. **[Frontend Build and Deploy](frontend-build-and-deploy.md)** - Learn the build process
3. **[Backend Build and Deploy](backend-build-and-deploy.md)** - Deploy serverless functions
4. **[CI/CD Overview](ci-cd-overview.md)** - Understand automation

## Additional Resources

- **[Project Bible - Complete Architecture](../PROJECT_BIBLE.md#complete-architecture)** - Detailed diagrams and data flows
- **[Repository Structure](../PROJECT_BIBLE.md#repository-structure)** - Complete directory tree with descriptions
- **[Technology Foundation](../PROJECT_BIBLE.md#technology-foundation)** - Version details and technology choices
