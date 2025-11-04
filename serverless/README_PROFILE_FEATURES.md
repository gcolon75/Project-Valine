# Profile & Settings Backend Features

This directory contains the backend implementation for Project Valine's profile management, media handling, settings, and privacy controls.

## Overview

The backend provides a comprehensive set of APIs for:
- **User Profiles** - Vanity URLs, headlines, bios, roles, locations, and social links
- **Media Management** - S3-based upload with privacy controls (public, on-request, private)
- **Professional Credits** - Film/TV credits with detailed metadata
- **User Settings** - Notifications, security, and privacy preferences
- **Reel Requests** - Access request flow for on-request media
- **Search & Discovery** - Profile and user search with filtering

## Quick Start

### 1. Install Dependencies

```bash
cd serverless
npm install
```

### 2. Set Up Database

```bash
# Copy the Prisma schema
cp ../api/prisma/schema.prisma ./prisma/

# Generate Prisma client
npx prisma generate

# Run migrations (development)
cd ../api
npx prisma migrate dev --name add_profile_settings_models

# Or deploy migrations (production)
npx prisma migrate deploy
```

### 3. Configure Environment

Create `.env` file:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/valine"
MEDIA_BUCKET="valine-media-uploads"
AWS_REGION="us-west-2"
JWT_SECRET="your-secret-key"
```

### 4. Deploy

```bash
# Deploy to AWS
npx serverless deploy --stage dev --region us-west-2

# Or use the deployment script
../scripts/deployment/deploy-backend.sh --stage dev --region us-west-2
```

## API Endpoints

### Profile Endpoints
- `GET /profiles/{vanityUrl}` - Get public profile
- `GET /profiles/id/{id}` - Get profile by ID (owner)
- `POST /profiles` - Create profile
- `PUT /profiles/id/{id}` - Update profile
- `DELETE /profiles/id/{id}` - Delete profile

### Media Endpoints
- `POST /profiles/{id}/media/upload-url` - Get signed upload URL
- `POST /profiles/{id}/media/complete` - Complete upload
- `PUT /media/{id}` - Update media
- `DELETE /media/{id}` - Delete media
- `GET /media/{id}/access-url` - Get signed viewing URL

### Credits Endpoints
- `GET /profiles/{id}/credits` - List credits
- `POST /profiles/{id}/credits` - Create credit
- `PUT /credits/{id}` - Update credit
- `DELETE /credits/{id}` - Delete credit

### Settings Endpoints
- `GET /settings` - Get user settings
- `PUT /settings` - Update settings
- `POST /account/export` - Export account data (GDPR)
- `DELETE /account` - Delete account (GDPR)

### Reel Request Endpoints
- `POST /reels/{id}/request` - Request access
- `GET /reel-requests` - List requests
- `POST /reel-requests/{id}/approve` - Approve request
- `POST /reel-requests/{id}/deny` - Deny request

### Search Endpoints
- `GET /search` - Search profiles
- `GET /search/users` - Search users

## Database Models

### Profile
- Vanity URL (unique)
- Headline, bio, roles, location
- Privacy settings (visibility, contact info)
- Tags and social links

### Media
- Type (image/video/pdf)
- S3 storage keys
- Privacy levels (public/on-request/private)
- Processing status
- Metadata (duration, dimensions, file size)

### Credit
- Title, role, company, year
- Description and metadata
- Custom ordering

### UserSettings
- Notification preferences
- Account security settings
- Privacy controls
- Billing references

### ReelRequest
- Media and requester info
- Status (pending/approved/denied)
- Messages and responses

## Privacy Controls

### Profile Privacy
- **Public** - Visible to everyone
- **Network** - Connections only
- **Private** - Not in search results

### Media Privacy
- **Public** - Anyone can view
- **On-Request** - Requires approved request
- **Private** - Owner only

### Access Flow
1. User requests access to on-request media
2. Owner receives notification
3. Owner approves or denies
4. Requester gets notification
5. If approved, requester can access media via signed URLs

## Testing

### Run Test Script

```bash
# Basic tests
./test-profile-endpoints.sh https://api-url/dev

# With authentication
./test-profile-endpoints.sh https://api-url/dev $AUTH_TOKEN
```

### Manual Testing

```bash
# Get auth token
TOKEN=$(curl -X POST https://api-url/dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.token')

# Create profile
curl -X POST https://api-url/dev/profiles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vanityUrl": "johndoe",
    "headline": "Actor & Director",
    "roles": ["Actor", "Director"]
  }'
```

## File Structure

```
serverless/
├── src/
│   ├── handlers/
│   │   ├── profiles.js       # Profile CRUD
│   │   ├── media.js          # Media management
│   │   ├── credits.js        # Credits CRUD
│   │   ├── settings.js       # Settings & account
│   │   ├── reelRequests.js   # Access requests
│   │   └── search.js         # Search & discovery
│   ├── db/
│   │   └── client.js         # Prisma client
│   └── utils/
│       └── headers.js        # Response helpers
├── prisma/
│   └── schema.prisma         # Database schema
├── serverless.yml            # Serverless config
├── API_PROFILE_SETTINGS.md   # API documentation
├── MIGRATION_GUIDE.md        # Deployment guide
└── test-profile-endpoints.sh # Test script
```

## Documentation

- **[API_PROFILE_SETTINGS.md](./API_PROFILE_SETTINGS.md)** - Complete API reference with examples
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Step-by-step deployment guide
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - General API documentation

## Security

### Authentication
- JWT tokens in Authorization header
- Token validation on protected endpoints
- User ownership verification

### S3 Security
- Private bucket (no public access)
- Pre-signed URLs for uploads
- Time-limited signed URLs for viewing
- Privacy checks before URL generation

### Database Security
- Prisma parameterized queries (SQL injection protection)
- Input validation on all endpoints
- Password hashing (use bcrypt in production)
- Connection pooling and limits

### Privacy
- GDPR-compliant data export
- Account deletion support
- Audit logging for private media access
- Rate limiting on request endpoints

## Performance

### Database
- Indexes on frequently queried fields
- Efficient includes for related data
- Cursor-based pagination
- Connection pooling

### S3 and CloudFront
- Direct S3 uploads (no Lambda bottleneck)
- CloudFront for fast delivery
- Cache headers for static assets
- Transfer acceleration for uploads

### Lambda
- Prisma client at module level (warm starts)
- Minimal cold start time
- Appropriate memory allocation
- Timeout configuration

## Troubleshooting

### Common Issues

**Prisma Client Not Found**
```bash
npx prisma generate
```

**Database Connection Errors**
```bash
# Check connection
psql $DATABASE_URL -c "SELECT 1;"

# Add connection limit
DATABASE_URL="postgresql://...?connection_limit=5"
```

**S3 Access Denied**
- Verify IAM role has S3 permissions
- Check bucket policy
- Ensure bucket name matches environment variable

**CORS Errors**
- Verify S3 CORS configuration
- Check API Gateway CORS settings
- Ensure proper headers in responses

### Debugging

```bash
# View Lambda logs
aws logs tail /aws/lambda/pv-api-dev-createProfile --follow

# Check deployment
npx serverless info --stage dev

# Test specific endpoint
curl -v https://api-url/dev/health
```

## Future Enhancements

### Background Processing
- [ ] Video transcoding pipeline
- [ ] Thumbnail generation
- [ ] HLS streaming derivatives
- [ ] Caption processing

### Search
- [ ] Elasticsearch/OpenSearch integration
- [ ] Real-time indexing
- [ ] Advanced filters
- [ ] Search analytics

### Monitoring
- [ ] CloudWatch dashboards
- [ ] Error alerts
- [ ] Performance metrics
- [ ] Audit logs

### Rate Limiting
- [ ] API throttling
- [ ] Request queue management
- [ ] DDoS protection
- [ ] User quotas

## Contributing

When adding new features:
1. Follow existing handler patterns
2. Add comprehensive error handling
3. Include privacy checks
4. Update API documentation
5. Add test cases
6. Update serverless.yml

## Support

For questions or issues:
- Check CloudWatch logs for errors
- Review API documentation
- Run test script for validation
- Check Prisma migration status

## License

Copyright © 2024 Project Valine
