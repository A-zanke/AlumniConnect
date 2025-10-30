# Critical Fixes - Events & Notifications

## 🔴 Issue 1: Students Can't See Events

### Problem
Students are not seeing any events in the Events page, even though events are created properly in the backend.

### Root Cause
The MongoDB query filter was too strict:
- Used `target_roles: 'student'` (exact match) instead of `$in: ['student']` (array contains)
- Used `$size: 0` which doesn't work properly for empty array checks
- Didn't handle cases where events target multiple roles

### Solution Applied
Updated `listEvents()` in `eventsController.js`:

**Before (WRONG):**
```javascript
filter = {
  status: 'active',
  target_roles: 'student',  // ❌ Exact match fails for arrays
  $or: [
    { target_student_combinations: { $elemMatch: {...} } },
    { target_student_combinations: { $size: 0 } }  // ❌ Unreliable
  ]
};
```

**After (CORRECT):**
```javascript
filter = {
  status: 'active',
  target_roles: { $in: ['student'] },  // ✅ Array contains check
  $or: [
    { target_student_combinations: { $elemMatch: {...} } },
    { target_student_combinations: { $exists: true, $eq: [] } }  // ✅ Reliable empty check
  ]
};
```

### What This Fixes
- ✅ Students can now see events targeting them
- ✅ Events with multiple target roles (student + teacher) now work
- ✅ Events with no specific department/year (all students) now show
- ✅ Same fix applied for teachers and alumni

---

## 🔴 Issue 2: Notification History Empty

### Problem
All notification history is gone - the notifications tab shows empty.

### Possible Causes
1. **Response format mismatch** - Backend returns array, frontend expects `{ data: array }`
2. **No notifications in database** - All notifications were deleted or never created
3. **Frontend API call issue** - Wrong endpoint or parsing error

### Solution Applied
Changed notification response format back to array:

**Before:**
```javascript
res.json({ data: safe });  // Wrapped in object
```

**After:**
```javascript
res.json(safe);  // Direct array
```

### Debugging Steps

**Step 1: Check if notifications exist in database**
```bash
cd backend
node scripts/checkNotifications.js
```

This will show:
- Total count of notifications
- Last 10 notifications with details
- Read/unread status

**Step 2: Check API response in browser**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Refresh notifications page
4. Look for `/api/notifications` request
5. Check response format

**Expected Response:**
```json
[
  {
    "_id": "...",
    "type": "event",
    "content": "New event: ...",
    "read": false,
    "sender": { "name": "...", "username": "..." },
    "createdAt": "..."
  }
]
```

**Step 3: Check frontend console for errors**
- Look for JavaScript errors
- Check if notifications are being filtered out
- Verify the API call is successful

---

## 🚀 Apply Fixes

### 1. Restart Backend Server
```bash
# Stop server (Ctrl+C)
cd backend
npm start
```

### 2. Test Events (Student)
1. Login as Student
2. Go to Events page
3. **Expected:** See events targeting your department + year
4. **If empty:** Check browser console for errors

### 3. Test Notifications
1. Go to Notifications page
2. **Expected:** See all past notifications (read + unread)
3. **If empty:** Run `node scripts/checkNotifications.js` to check database

### 4. Debug Notifications (if still empty)
```bash
# Check database
cd backend
node scripts/checkNotifications.js
```

**If count is 0:**
- Notifications were never created or were deleted
- Need to create new events to generate notifications

**If count > 0 but frontend shows empty:**
- Check browser console for errors
- Check Network tab for API response
- Verify frontend is parsing response correctly

---

## 📋 Quick Checklist

After restarting server:

**Events:**
- [ ] Students can see events in Events page
- [ ] Events targeting specific department/year show up
- [ ] Events targeting "all students" show up
- [ ] No console errors

**Notifications:**
- [ ] Notifications page loads without errors
- [ ] Past notifications are visible
- [ ] Read notifications show with different styling
- [ ] Unread count is correct

**If Issues Persist:**
1. Check backend console for errors
2. Check browser console for errors
3. Run `node scripts/checkNotifications.js`
4. Share the output for further debugging

---

## 🔧 Additional Fixes Applied

### Route Ordering Fix
Fixed `/api/users/mutual/connections` error by moving specific routes before param routes:

```javascript
// Specific routes FIRST
router.get('/mutual/connections', protect, getMyMutualConnections);

// Then param routes
router.get('/:userId/connections', protect, async (req, res) => {
```

---

## 📝 Summary

**Three main fixes:**
1. ✅ Event filtering for students (use `$in` for array matching)
2. ✅ Notification response format (return array directly)
3. ✅ Route ordering (specific routes before params)

**Restart server and test!** 🚀
