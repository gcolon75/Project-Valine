# Runbook: Create Post 500 - Unknown argument audioUrl

## Symptom
- **Endpoint**: `POST /posts`
- **Status Code**: 500 Internal Server Error
- **Error Message**: `PrismaClientValidationError: Unknown argument audioUrl`
- **Observable in**: CloudWatch logs, API error responses

## Root Cause
The backend `createPost` handler in `serverless/src/handlers/posts.js` was attempting to pass `audioUrl` as a field to `prisma.post.create()`, but the Post model in the Prisma schema (`serverless/prisma/schema.prisma`) does not include an `audioUrl` field.

This mismatch between the handler code and the database schema caused Prisma to reject the create operation with a validation error.

### Schema State
The Post model includes these fields:
- `id`, `content`, `media`, `tags`, `authorId`, `createdAt`, `updatedAt`
- `mediaId`, `visibility`, `isFree`, `price`, `thumbnailUrl`, `requiresAccess`, `allowDownload`

**Missing**: `audioUrl` field

## Fix Applied

### Backend Changes
1. **Removed `audioUrl` from Prisma create data** in `serverless/src/handlers/posts.js`:
   ```javascript
   const post = await prisma.post.create({
     data: { 
       content, 
       media: media || [], 
       tags: safeTags,
       authorId,
       mediaId: mediaId || null,
       visibility: postVisibility,
       // audioUrl removed - not in Post schema
       price: (postPrice && postPrice > 0) ? postPrice : null,
       isFree: postIsFree,
       thumbnailUrl: thumbnailUrl || null,
       requiresAccess: requiresAccess || false,
       allowDownload: allowDownload || false,
     },
     // ...
   });
   ```

2. **Improved error handling** to return 400 for validation errors:
   ```javascript
   } catch (e) {
     log('create_post_error', { route, error: e.message, stack: e.stack });
     console.error(e);
     
     // Return 400 for validation errors
     if (e.name === 'PrismaClientValidationError' || e.message?.includes('Unknown argument')) {
       return error(400, 'Invalid post data: ' + e.message);
     }
     
     return error(500, 'Server error: ' + e.message);
   }
   ```

### Frontend Changes
**Removed `audioUrl` from post payload** in `src/pages/Post.jsx`:
```javascript
const postPayload = {
  content: formData.description || formData.title,
  authorId: user?.id,
  tags: Array.isArray(formData.tags) ? formData.tags : [],
  media: [],
  mediaId: uploadedMediaId || null,
  visibility: formData.visibility || 'PUBLIC',
  // audioUrl removed - not supported in Post schema yet
  price: priceValue,
  isFree: formData.isFree,
  thumbnailUrl: formData.thumbnailUrl || null,
  requiresAccess: formData.requiresAccess || false,
  allowDownload: formData.allowDownload || false,
};
```

## Recovery Steps

### If Issue Occurs Again
1. **Check CloudWatch Logs** for the specific error:
   ```
   {
     "event": "create_post_error",
     "error": "Unknown argument `audioUrl`",
     "route": "POST /posts"
   }
   ```

2. **Verify Schema and Code Alignment**:
   ```bash
   # Review Post model schema
   cat serverless/prisma/schema.prisma | grep -A 30 "model Post"
   
   # Check handler code
   grep -A 20 "prisma.post.create" serverless/src/handlers/posts.js
   ```

3. **If Field Should Be Added**:
   - Add migration to schema:
     ```prisma
     model Post {
       // ... existing fields
       audioUrl   String?
     }
     ```
   - Generate and deploy migration:
     ```bash
     cd serverless
     npm run prisma:generate
     npx prisma migrate dev --name add-audiourl-to-post
     npm run prisma:deploy  # for production
     ```
   - Update handler to include the field

4. **If Field Should Be Removed** (current approach):
   - Strip unsupported fields from request payload
   - Return 400 for validation errors

## Verification Steps

### 1. Test POST /posts Endpoint
```bash
# Set your JWT token
export TOKEN="your-jwt-token"

# Create a test post
curl -X POST https://api.yourdomain.com/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Test post",
    "authorId": "your-user-id",
    "tags": ["test"],
    "visibility": "PUBLIC"
  }'

# Expected: 201 Created with post object
# Not: 500 with audioUrl error
```

### 2. Check CloudWatch Logs
- Look for `create_post_success` events
- Verify no `create_post_error` with "Unknown argument" messages

### 3. Test Frontend Post Creation
1. Navigate to `/post` page
2. Fill in post form
3. Submit post
4. Verify successful creation and redirect to dashboard
5. Check browser console for errors

## Smoke Test Checklist
- [ ] POST /posts returns 201 (not 500)
- [ ] Post appears in author's profile
- [ ] Post appears in feed
- [ ] No "Unknown argument" errors in CloudWatch
- [ ] Validation errors return 400 (not 500)
- [ ] Frontend post creation works without errors

## Deployment Notes
After applying this fix:
1. **Backend deployment** required: `npm run deploy` in `serverless/`
2. **Frontend deployment** required: `npm run build` and deploy to S3/CloudFront
3. **No database migration** required (no schema changes)
4. **Rollback safe**: Changes are backward compatible

## Related Files
- `serverless/src/handlers/posts.js` - Backend post creation handler
- `src/pages/Post.jsx` - Frontend post creation form
- `serverless/prisma/schema.prisma` - Database schema
- `src/services/postService.js` - Frontend API service

## Prevention
- **Schema-First Development**: Update schema first, then code
- **Type Safety**: Consider using TypeScript for compile-time checks
- **Integration Tests**: Add tests for post creation with various payloads
- **Code Reviews**: Verify Prisma data objects match schema

## Contact
For issues or questions about this runbook, refer to:
- Project Documentation: `docs/`
- API Documentation: `docs/api/`
- Team: Development Team

---
**Last Updated**: 2025-12-24  
**Author**: GitHub Copilot  
**Version**: 1.0
