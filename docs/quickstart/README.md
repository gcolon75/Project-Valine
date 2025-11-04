# Quick Start Guide - Project Valine Deployment

Get Project Valine up and running in minutes.

## ⚡ Prerequisites

- ✅ Node.js 20.x+
- ✅ npm 9.x+
- ✅ AWS CLI configured
- ✅ Serverless Framework 3.x
- ✅ PostgreSQL/MySQL database (or SQLite for dev)

## 🚀 5-Minute Deployment

### 1. Setup Database (1 min)

```bash
export DATABASE_URL="postgresql://user:password@host:5432/valine_db"
./scripts/deployment/setup-database.sh
```

### 2. Deploy Backend (2 min)

```bash
./scripts/deployment/deploy-backend.sh --stage dev --region us-west-2
```

**Save your API URL from the output!**

### 3. Test API (1 min)

```bash
export API_BASE="https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev"
./scripts/deployment/test-endpoints.sh
```

### 4. Configure Frontend (30 sec)

```bash
./scripts/deployment/configure-frontend.sh --api-url "$API_BASE"
```

### 5. Run Locally (30 sec)

```bash
npm install
npm run dev
```

Visit: http://localhost:5173

## 🔧 One-Liner Deployment

For experienced users:

```bash
export DATABASE_URL="postgresql://user:pass@host:5432/db" && \
./scripts/deployment/setup-database.sh && \
./scripts/deployment/deploy-backend.sh --stage dev --region us-west-2 && \
read -p "Enter API Gateway URL: " API_BASE && \
export API_BASE && \
./scripts/deployment/test-endpoints.sh && \
./scripts/deployment/configure-frontend.sh --api-url "$API_BASE" && \
npm run dev
```

## 📝 Common Commands

```bash
# Database
npx prisma studio              # View database GUI
npx prisma migrate deploy      # Run migrations

# Backend
cd serverless
npx serverless logs -f getUser --tail    # View logs
npx serverless info                      # Show deployment info
npx serverless remove                    # Delete deployment

# Frontend
npm run dev                    # Development server
npm run build                  # Production build
npm run preview                # Preview production build

# Testing
curl $API_BASE/health          # Health check
```

## 🐛 Quick Fixes

### Connection Failed
```bash
# Check database URL
echo $DATABASE_URL

# Test connection
psql "$DATABASE_URL" -c "SELECT 1;"
```

### API Not Responding
```bash
# View Lambda logs
cd serverless
npx serverless logs -f getUser --stage dev --tail

# Check AWS CLI
aws sts get-caller-identity
```

### Frontend Not Loading Data
```bash
# Verify .env
cat .env

# Test API directly
curl $API_BASE/health

# Restart dev server
npm run dev
```

## 📚 Full Documentation

- [Complete Deployment Guide](./DEPLOYMENT.md) - Comprehensive instructions
- [Deployment Scripts README](./scripts/deployment/README.md) - Script documentation
- [Troubleshooting](./DEPLOYMENT.md#troubleshooting) - Detailed problem solving

## 🎯 Testing Checklist

- [ ] Database tables created (users, posts, connection_requests)
- [ ] Backend deployed to AWS
- [ ] API health check returns 200
- [ ] Can create user via API
- [ ] Can fetch user profile
- [ ] Can create post
- [ ] Frontend loads at localhost:5173
- [ ] Profile page shows real data
- [ ] Dashboard displays posts

## 💡 Pro Tips

1. **Use SQLite for quick local testing:**
   ```bash
   export DATABASE_URL="file:./dev.db"
   ```

2. **Watch logs during development:**
   ```bash
   npx serverless logs -f getUser --stage dev --tail
   ```

3. **Test API with Postman/Insomnia** - Import OpenAPI spec (coming soon)

4. **Use Prisma Studio** to inspect/modify data:
   ```bash
   cd api && npx prisma studio
   ```

5. **Deploy to multiple stages:**
   ```bash
   # Development
   ./scripts/deployment/deploy-backend.sh --stage dev
   
   # Staging
   ./scripts/deployment/deploy-backend.sh --stage staging
   
   # Production
   ./scripts/deployment/deploy-backend.sh --stage prod
   ```

## 🌟 Next Steps

After deployment:

1. ✅ Add more test data
2. ✅ Implement authentication (JWT)
3. ✅ Set up monitoring (CloudWatch)
4. ✅ Add rate limiting
5. ✅ Deploy to production
6. ✅ Set up CI/CD pipeline
7. ✅ Add end-to-end tests

## 🆘 Need Help?

- 📖 [Full Deployment Guide](./DEPLOYMENT.md)
- 🐛 [GitHub Issues](https://github.com/gcolon75/Project-Valine/issues)
- 💬 [Contributing Guidelines](./CONTRIBUTING.md)

---

**Estimated Time:** 5-10 minutes for complete deployment

Last Updated: October 29, 2025
