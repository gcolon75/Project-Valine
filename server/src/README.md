# Project Valine Backend API

Backend API server for Project Valine, providing endpoints for user preferences, profiles, and dashboard statistics.

## Quick Start

```bash
# Install dependencies
cd server
npm install

# Start the server
npm start

# Development mode with auto-reload
npm run dev
```

Server runs on `http://localhost:5000` by default.

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user

### Health Check
- `GET /health` - Server health status

### User Preferences
- `GET /preferences/:userId` - Get user preferences (theme)
- `PATCH /preferences/:userId` - Update user preferences

### User Profiles
- `GET /profiles/:userId` - Get user profile (title, headline, social links)
- `PATCH /profiles/:userId` - Update user profile

### Dashboard Statistics
- `GET /dashboard/stats?userId=X&range=Y` - Get aggregated statistics

## Documentation

Detailed API documentation is available in the `/docs/api/` directory:

- [User Preferences API](../../docs/api/preferences.md)
- [User Profiles API](../../docs/api/profiles.md)
- [Dashboard Statistics API](../../docs/api/dashboard.md)

## Project Structure

```
server/src/
├── index.js                 # Express app setup and server start
├── routes/                  # API route handlers
│   ├── auth.js             # Authentication endpoints
│   ├── dashboard.js        # Dashboard statistics
│   ├── health.js           # Health check
│   ├── preferences.js      # User preferences
│   ├── profiles.js         # User profiles
│   └── __tests__/          # Contract tests
│       ├── dashboard.test.js
│       ├── preferences.test.js
│       └── profiles.test.js
└── utils/                   # Shared utilities
    ├── validators.js       # Validation and sanitization
    └── __tests__/
        └── validators.test.js
```

## Environment Variables

Create a `.env` file in the server directory:

```env
PORT=5000
CORS_ORIGIN=http://localhost:5173
```

## Testing

The API includes comprehensive contract tests:

```bash
# Run all tests
npm test

# Run specific test file
npm test -- preferences.test.js

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Test Structure

- **Contract Tests**: Validate API contracts (request/response formats)
- **Unit Tests**: Test individual validation functions
- **Integration Tests**: Test multiple components together

### Test Coverage

Current test coverage:
- Preferences API: 12 test cases
- Profiles API: 18 test cases
- Dashboard API: 15 test cases
- Validators: 30+ test cases

## Validation

All endpoints use shared validation utilities from `utils/validators.js`:

### URL Validation
```javascript
import { validateUrl } from './utils/validators.js'

const result = validateUrl('https://example.com')
if (!result.valid) {
  console.error(result.error)
}
```

### Theme Validation
```javascript
import { validateTheme } from './utils/validators.js'

const result = validateTheme('dark')
// { valid: true }
```

### String Length Validation
```javascript
import { validateStringLength } from './utils/validators.js'

const result = validateStringLength('hello', 1, 100, 'title')
// { valid: true }
```

### Input Sanitization
```javascript
import { sanitizeString } from './utils/validators.js'

const clean = sanitizeString('  hello  ')
// 'hello'
```

## Error Handling

All endpoints return consistent error formats:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "fieldName",
      "value": "invalidValue",
      "additionalInfo": "..."
    }
  }
}
```

Common error codes:
- `INVALID_THEME` - Invalid theme value
- `INVALID_URL` - Invalid URL format or protocol
- `INVALID_TITLE` - Title validation failed
- `INVALID_HEADLINE` - Headline validation failed
- `INVALID_SOCIAL_LINKS` - Social links validation failed
- `INVALID_SOCIAL_LINK_KEY` - Unsupported social platform
- `INVALID_RANGE` - Invalid time range
- `MISSING_USER_ID` - Required userId parameter missing

## Security

### URL Validation
- Only `http://` and `https://` protocols allowed
- Maximum URL length: 2048 characters
- Invalid URLs are rejected with clear error messages

### Input Sanitization
- All string inputs are trimmed
- Length limits enforced
- Special characters handled safely

### Recommendations
1. Add authentication middleware to protect endpoints
2. Implement rate limiting to prevent abuse
3. Add request logging for security monitoring
4. Enable CORS only for trusted origins
5. Use HTTPS in production

## Caching

### Dashboard Statistics
The dashboard stats endpoint includes cache headers:

```
Cache-Control: private, max-age=300
Vary: Authorization
```

This caches responses for 5 minutes per user.

### Future Enhancements
Consider implementing:
- Redis for server-side caching
- ETags for conditional requests
- Cache invalidation on updates

## Database Integration

Currently, all endpoints return mock data. To integrate with a real database:

1. **Install Prisma Client**:
   ```bash
   npm install @prisma/client
   ```

2. **Import Prisma Client**:
   ```javascript
   import { PrismaClient } from '@prisma/client'
   const prisma = new PrismaClient()
   ```

3. **Replace mock data with queries**:
   ```javascript
   // Before (mock)
   const user = { id: 'user_123', theme: 'light' }
   
   // After (database)
   const user = await prisma.user.findUnique({
     where: { id: userId }
   })
   ```

See the [Prisma schema](../../api/prisma/schema.prisma) for the database structure.

## Migrations

Database migrations are in `/api/prisma/migrations/`:

1. `20251105004900_add_user_theme_preference` - Adds theme field to users
2. `20251105005100_add_profile_title` - Adds title field to profiles

Each migration includes rollback documentation.

## Development Tips

### Adding a New Endpoint

1. Create route file in `routes/`:
   ```javascript
   import { Router } from 'express'
   const router = Router()
   
   router.get('/', (req, res) => {
     res.json({ data: 'example' })
   })
   
   export default router
   ```

2. Register route in `index.js`:
   ```javascript
   import exampleRouter from './routes/example.js'
   app.use('/example', exampleRouter)
   ```

3. Add tests in `routes/__tests__/`

4. Document in `/docs/api/`

### Adding a New Validator

1. Add function to `utils/validators.js`:
   ```javascript
   export function validateExample(value) {
     if (!value) {
       return { valid: false, error: 'Value required' }
     }
     return { valid: true }
   }
   ```

2. Add tests in `utils/__tests__/validators.test.js`

3. Use in route handlers

## Troubleshooting

### Port Already in Use
If port 5000 is in use:
```bash
PORT=5001 npm start
```

### Module Not Found
Ensure you're using ES modules (`.js` files with `type: "module"` in `package.json`).

### CORS Errors
Update `CORS_ORIGIN` in `.env` to match your frontend URL.

### Test Failures
Ensure the server is not running when tests start:
```bash
pkill -f "node.*src/index.js"
npm test
```

## Contributing

1. Follow existing code style
2. Add tests for new features
3. Update documentation
4. Use consistent error formats
5. Validate all inputs
6. Sanitize user data

## License

See the main project LICENSE file.
