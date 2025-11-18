# Project Valine - Serverless Backend

This directory contains the AWS Lambda-based serverless backend for Project Valine, built with the Serverless Framework and Prisma ORM.

## 🚀 Quick Start

**For complete deployment instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**

### Prerequisites

1. AWS credentials configured
2. PostgreSQL database URL
3. JWT secret generated

### Quick Deploy

```bash
# 1. Install dependencies
npm ci

# 2. Build Prisma layer (first time only)
./build-prisma-layer.sh

# 3. Validate configuration
./validate-deployment.sh

# 4. Set environment variables
export DATABASE_URL="postgresql://user:pass@host:5432/db"
export JWT_SECRET="your-jwt-secret"

# 5. Deploy
npx serverless deploy --stage prod --region us-west-2
```

## 🔐 Allowlist-Based Registration

By default, only these emails can register:
- `ghawk075@gmail.com`
- `valinejustin@gmail.com`

### Managing the Allowlist

```bash
# Update allowed emails
export ALLOWED_USER_EMAILS="email1@example.com,email2@example.com"

# Redeploy
npx serverless deploy --stage prod --region us-west-2
```

Or update directly in AWS Lambda Console without redeployment.

### Opening Public Registration

```bash
export ENABLE_REGISTRATION="true"
npx serverless deploy --stage prod --region us-west-2
```

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `build-prisma-layer.sh` | Builds Prisma Lambda layer with Linux binaries |
| `validate-deployment.sh` | Validates configuration before deployment |
| `deploy.sh` | Quick deployment script (uses .env.prod) |
| `validate-config.sh` | Legacy config validation |

## 🔧 Development Setup

```bash
# 1. Set environment variables
export DATABASE_URL="postgresql://user:password@host:5432/valine_db"
export AWS_REGION="us-west-2"
export STAGE="dev"

# 2. Install dependencies
npm install

# 3. Generate Prisma Client
cd ../api && npx prisma generate && cd ../serverless

# 4. Deploy to dev
npx serverless deploy --stage dev --region us-west-2
```

## 📁 Directory Structure

```
serverless/
├── src/
│   ├── handlers/          # Lambda function handlers
│   │   ├── auth.js        # Authentication (register, login, me)
│   │   ├── reels.js       # Reels CRUD and interactions
│   │   ├── posts.js       # Posts CRUD (legacy)
│   │   ├── users.js       # User management
│   │   ├── conversations.js # Messaging
│   │   ├── notifications.js # Notifications
│   │   ├── connections.js   # Connection requests
│   │   ├── health.js      # Health check
│   │   └── meta.js        # API metadata
│   ├── db/
│   │   └── client.js      # Prisma client singleton
│   └── utils/
│       └── headers.js     # Response helpers
├── serverless.yml         # Serverless Framework config
├── package.json
├── API_DOCUMENTATION.md   # Complete API documentation
├── DEPLOYMENT_GUIDE.md    # Deployment instructions
├── test-endpoints.sh      # Test script
└── README.md             # This file
```

## 📚 Documentation

- **[API Documentation](./API_DOCUMENTATION.md)** - Complete API reference with examples
- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Step-by-step deployment instructions

## 🔑 Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `AWS_REGION` - AWS region (default: us-west-2)
- `STAGE` - Deployment stage (dev, staging, prod)

Optional:
- `JWT_SECRET` - JWT signing secret (auto-generated for dev)

## 🛠️ Available Commands

```bash
# Deploy to AWS
npm run deploy

# Remove from AWS
npm run remove

# Generate Prisma Client
npm run prisma:generate

# Run migrations (development)
npm run prisma:migrate

# Deploy migrations (production)
npm run prisma:deploy
```

## 🧪 Testing

Test your deployed API:

```bash
# Set your API URL
export API_BASE="https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev"

# Run test suite
./test-endpoints.sh

# Or test individual endpoints
curl "$API_BASE/health"
curl "$API_BASE/meta"
```

## 📊 Available Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token
- `GET /auth/me` - Get current user (authenticated)

### Reels
- `GET /reels` - List reels with pagination
- `POST /reels` - Create new reel (authenticated)
- `POST /reels/:id/like` - Toggle like (authenticated)
- `POST /reels/:id/bookmark` - Toggle bookmark (authenticated)
- `GET /reels/:id/comments` - Get comments
- `POST /reels/:id/comments` - Add comment (authenticated)

### Conversations & Messages
- `GET /conversations` - List conversations (authenticated)
- `POST /conversations` - Create conversation (authenticated)
- `GET /conversations/:id/messages` - Get messages (authenticated)
- `POST /conversations/:id/messages` - Send message (authenticated)

### Notifications
- `GET /notifications` - List notifications (authenticated)
- `PATCH /notifications/:id/read` - Mark as read (authenticated)
- `PATCH /notifications/mark-all` - Mark all as read (authenticated)

### Users
- `GET /users/:username` - Get user profile
- `PUT /users/:id` - Update user (authenticated)

### Other
- `GET /health` - Health check
- `GET /meta` - API metadata

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete details.

## 🔐 Authentication

The API uses JWT Bearer tokens for authentication:

1. Register or login to get a token
2. Include in requests: `Authorization: Bearer <token>`
3. Tokens are valid for 7 days

Example:
```bash
# Register
TOKEN=$(curl -X POST "$API_BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123","username":"user","displayName":"User"}' \
  | jq -r '.token')

# Use token
curl "$API_BASE/auth/me" -H "Authorization: Bearer $TOKEN"
```

## 📦 Database Schema

The backend uses Prisma with PostgreSQL. Key models:

- **User** - User accounts with authentication
- **Reel** - Video content (reels)
- **Comment** - Comments on reels
- **Like** - Likes on reels
- **Bookmark** - Saved reels
- **Conversation** - Message threads
- **Message** - Individual messages
- **Notification** - User notifications
- **Post** - Text posts (legacy)
- **ConnectionRequest** - Connection requests between users

See `../api/prisma/schema.prisma` for complete schema.

## 🔄 Pagination

All list endpoints support cursor-based pagination:

```bash
# First page
curl "$API_BASE/reels?limit=20"

# Response: { "items": [...], "nextCursor": "abc123", "hasMore": true }

# Next page
curl "$API_BASE/reels?limit=20&cursor=abc123"
```

## 🚨 Error Handling

All errors return:
```json
{
  "error": "Error message"
}
```

Common status codes:
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

## 🌐 CORS

CORS is enabled for all origins in development:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
```

For production, configure specific origins in `serverless.yml`.

## 📈 Performance

- Lambda cold start: ~1-2 seconds
- Warm Lambda: ~50-200ms
- Database queries: ~10-50ms
- Prisma uses connection pooling

Tips:
- Use provisioned concurrency for critical functions
- Optimize Prisma queries with `include`
- Implement caching for frequently accessed data

## 🔧 Troubleshooting

### Database Connection Issues
- Check DATABASE_URL format
- Verify database is accessible from Lambda
- Use connection pooling for RDS

### Lambda Timeouts
- Increase timeout in serverless.yml
- Check database query performance
- Review CloudWatch logs

### CORS Errors
- Verify frontend origin
- Check API Gateway CORS settings
- Ensure headers in all responses

### Authentication Failures
- Verify JWT_SECRET is set
- Check token expiration
- Validate Authorization header format

## 🏗️ Development

### Local Development

The serverless backend is designed for AWS Lambda, but you can test handlers locally:

```bash
# Test a handler
node -e "import('./src/handlers/health.js').then(m => m.handler().then(console.log))"
```

For full local development, consider using:
- Serverless Offline plugin
- Local PostgreSQL database
- Docker for dependencies

### Adding New Endpoints

1. Create handler in `src/handlers/`
2. Add function to `serverless.yml`
3. Update API documentation
4. Test endpoint
5. Deploy

Example:
```javascript
// src/handlers/myHandler.js
import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';

export const handler = async (event) => {
  try {
    const prisma = getPrisma();
    // Your logic here
    return json({ success: true });
  } catch (e) {
    console.error(e);
    return error('Server error: ' + e.message, 500);
  }
};
```

### Database Migrations

```bash
# Create migration
cd ../api
npx prisma migrate dev --name feature_name

# Apply to production
npx prisma migrate deploy
```

## 🔒 Security

- Passwords are hashed with SHA-256 (use bcrypt in production)
- JWT tokens for authentication
- CORS configured
- Input validation on all endpoints
- SQL injection protection via Prisma
- Environment variables for secrets

Production recommendations:
- Use AWS Secrets Manager for DATABASE_URL
- Implement rate limiting
- Add request validation
- Enable AWS WAF
- Use bcrypt for password hashing
- Rotate JWT secrets regularly

## 💰 Cost Estimation

AWS Free Tier includes:
- 1M Lambda requests/month
- 1M API Gateway requests/month
- 400,000 GB-seconds compute time

Typical costs beyond free tier:
- Lambda: $0.20 per 1M requests
- API Gateway: $3.50 per 1M requests
- RDS: $15-50/month (depending on instance)

## 📝 License

See main repository LICENSE file.

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Update documentation
5. Submit pull request

## 📞 Support

- GitHub Issues: [Project Valine Issues](https://github.com/gcolon75/Project-Valine/issues)
- Documentation: See main repository README

## 🎯 Next Steps

1. ✅ Deploy backend to AWS
2. ✅ Test all endpoints
3. ✅ Get API_BASE URL
4. ✅ Update frontend configuration
5. ✅ Set up monitoring
6. ✅ Configure CI/CD

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.
