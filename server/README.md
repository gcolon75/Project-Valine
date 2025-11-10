# Express Server (Legacy Development Only)

> **⚠️ IMPORTANT: DO NOT DEPLOY TO STAGING OR PRODUCTION**

This Express server is a **legacy development stub** and should **only** be used for local development and testing.

## Canonical Backend

The **Serverless backend** located in `/serverless` is the canonical production API and should be deployed to staging and production environments.

## Purpose of This Server

- **Local development**: Quick iteration without deploying to AWS
- **Testing**: Unit and integration tests for API routes
- **Development stubs**: Placeholder routes for features not yet implemented in Serverless

## Why Not Deploy This Server?

1. **Architecture**: Serverless is designed for production scalability, this server is not
2. **Maintenance**: Keeping two backends in sync creates drift and bugs
3. **Security**: Serverless has production-hardened security; this server is dev-quality only
4. **Performance**: Serverless auto-scales; this server would require manual scaling
5. **Cost**: Serverless is more cost-effective for production workloads

## Migration Status

All production-ready routes have been migrated to the Serverless backend:

- ✅ Authentication (`/auth/*`) - In Serverless
- ✅ User Profiles (`/profiles/*`) - In Serverless
- ✅ Media Upload (`/profiles/:id/media/*`) - In Serverless
- ✅ Settings (`/api/settings`) - In Serverless
- ✅ Account Management (`/api/account/*`) - In Serverless
- ✅ Search (`/search/*`) - In Serverless
- ✅ Reels (`/reels/*`) - In Serverless
- ✅ Reel Requests (`/reels/:id/request`) - In Serverless

## Local Development Usage

```bash
# Install dependencies
cd server
npm install

# Start development server
npm start

# Server runs on http://localhost:5000
```

## For Production Deployments

**Always deploy the Serverless backend:**

```bash
cd serverless
npm install
npx serverless deploy --stage prod
```

See [Serverless Deployment Guide](../docs/deployment/serverless-guide.md) for full instructions.

## Questions?

- **"Should I add a new route here?"** → No, add it to `/serverless` instead
- **"Should I fix a bug here?"** → Only if it's dev-only; otherwise fix in `/serverless`
- **"Can I deploy this for testing?"** → Only locally; use Serverless for staging/prod

## References

- [Canonical Backend Decision](../docs/backend/canonical-backend.md)
- [Serverless Backend Directory](../serverless/)
- [Deployment Guide](../docs/deployment/)
