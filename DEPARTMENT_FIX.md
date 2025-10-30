# Department Fetching Fix

## Issues Fixed

### 1. ❌ Only 2 Departments Showing
**Problem:** The `/api/search/departments` endpoint was fetching from an empty `Department` collection.

**Solution:** Updated the endpoint to:
1. First check Department collection
2. If empty, fetch unique departments from registered users
3. Auto-populate Department collection for future use
4. Fallback to default departments if no users exist

### 2. ❌ 404 Error for `/api/events/registered/mine`
**Problem:** Route was being matched by `/:eventId` parameter route before reaching the specific route.

**Solution:** Reordered routes to put most specific routes first:
```javascript
// Before (incorrect order)
router.get('/', protect, listEvents);
router.get('/mine', protect, listMyEvents);
router.get('/registered/mine', protect, getMyRegisteredEvents);
router.get('/:eventId', protect, getEventById);

// After (correct order)
router.get('/registered/mine', protect, getMyRegisteredEvents);
router.get('/mine', protect, listMyEvents);
router.get('/', protect, listEvents);
router.get('/:eventId', protect, getEventById);
```

## Files Modified

1. **`backend/routes/searchRoutes.js`**
   - Updated `/api/search/departments` endpoint
   - Now fetches from User collection if Department collection is empty
   - Auto-populates Department collection

2. **`backend/routes/eventsRoutes.js`**
   - Reordered routes for proper matching
   - Most specific routes now come first

## Files Created

1. **`backend/scripts/populateDepartments.js`**
   - Utility script to manually populate departments
   - Run once to sync existing user departments

## How to Use

### Option 1: Automatic (Recommended)
The departments will now automatically populate when you access the Events page. The endpoint will:
1. Check if departments exist
2. If not, fetch from users
3. Save to Department collection
4. Return the list

### Option 2: Manual Population
Run the utility script to populate departments immediately:

```bash
cd backend
node scripts/populateDepartments.js
```

This will:
- Connect to your database
- Extract unique departments from User collection
- Populate the Department collection
- Display a summary

## Expected Behavior

### Before Fix
- Only 2 departments showing (likely defaults)
- 404 error for student registered events
- Department list not synced with actual registrations

### After Fix
- All departments from registered users appear
- Student registered events load correctly
- Department list automatically syncs
- Fallback to defaults if no users exist

## Testing

1. **Restart the backend server**
   ```bash
   npm start
   ```

2. **Test department fetching**
   - Go to Events page
   - Click "Create Event"
   - Check department dropdown
   - Should show all departments from registered users

3. **Test student registered events**
   - Login as a student
   - Go to Events page
   - Click "My Attended Events" tab
   - Should load without 404 error

## Default Departments

If no users are registered or Department collection is empty, the system falls back to:
- CSE
- AI-DS
- E&TC
- Mechanical
- Civil
- Other

## Notes

- Departments are now dynamically fetched from actual user registrations
- The Department collection serves as a cache
- Auto-population happens on first request
- No manual intervention needed after server restart
