# API Debug Guide

## Issues Identified
1. **Poll voting not working** - Users can't vote on polls
2. **Reactions not working** - Users can't react to posts
3. **Post creation failing** - Users can't create posts
4. **Comments not working** - Users can't comment on posts

## Debugging Steps Added

### Frontend Debugging
- Added console logging to API requests and responses
- Added better error messages for user feedback
- Added token validation warnings

### Backend Debugging
- Added console logging to reaction and poll voting endpoints
- Added request parameter logging

## Common Issues and Solutions

### 1. Authentication Issues
**Problem**: API calls failing with 401 errors
**Solution**: 
- Check if token is stored in localStorage
- Verify token is being sent in Authorization header
- Check if token is valid and not expired

### 2. Database Connection Issues
**Problem**: API calls failing with 500 errors
**Solution**:
- Check if MongoDB is running
- Verify database connection string
- Check if models are properly imported

### 3. CORS Issues
**Problem**: API calls failing with CORS errors
**Solution**:
- Check if CORS is properly configured in server.js
- Verify frontend and backend are on correct ports

### 4. Route Issues
**Problem**: API calls returning 404 errors
**Solution**:
- Check if routes are properly defined
- Verify route paths match frontend API calls
- Check if routes are properly mounted in server.js

## Testing Steps

1. **Check Browser Console**
   - Open browser developer tools
   - Look for API request/response logs
   - Check for error messages

2. **Check Backend Console**
   - Look for request logs
   - Check for error messages
   - Verify database operations

3. **Test API Endpoints**
   - Use Postman or curl to test endpoints directly
   - Verify authentication is working
   - Check response formats

## Expected API Behavior

### Successful Request
```
API Request: POST /api/unified-forum/posts/123/reactions
API Response: 200 { success: true, data: {...} }
```

### Failed Request
```
API Error: 401 /api/unified-forum/posts/123/reactions { message: "Not authorized, no token" }
```

## Next Steps

1. Start both frontend and backend servers
2. Open browser console
3. Try to vote on a poll or react to a post
4. Check console logs for debugging information
5. Fix any issues found in the logs
