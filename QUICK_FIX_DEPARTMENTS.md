# Quick Fix: Department Dropdown Showing Only 2 Departments

## Problem
The department dropdown in Event creation is only showing 2 departments (AI-DS, CSE) instead of all 6 default departments.

## Root Cause
The Department collection in MongoDB is not populated with the default departments yet.

## Solution (Choose One)

### Option 1: Run Initialization Script (RECOMMENDED - 30 seconds)

1. **Stop your backend server** (Ctrl+C if running)

2. **Run the initialization script:**
   ```bash
   cd backend
   node scripts/initDepartments.js
   ```

3. **You should see:**
   ```
   ✅ Connected to MongoDB
   
   📦 Initializing default departments...
      Departments to add: CSE, AI-DS, E&TC, Mechanical, Civil, Other
   
      ✓ CSE - created
      ✓ AI-DS - already exists
      ✓ E&TC - created
      ✓ Mechanical - created
      ✓ Civil - created
      ✓ Other - created
   
   📊 Summary:
      - Added: 5
      - Already existed: 1
      - Total: 6/6
   
   📋 All Departments in Database (6 total):
      - AI-DS
      - CSE
      - Civil
      - E&TC
      - Mechanical
      - Other
   
   ✅ Done! Departments initialized successfully.
   ```

4. **Restart your backend server:**
   ```bash
   npm start
   ```

5. **Refresh your browser** - All 6 departments should now appear!

### Option 2: Let It Auto-Sync (2 minutes)

1. **Restart your backend server:**
   ```bash
   cd backend
   npm start
   ```

2. **Go to Events page in browser**

3. **Open browser console** (F12)

4. **Check the console log** - You should see:
   ```
   Fetched departments: ['AI-DS', 'CSE', 'Civil', 'E&TC', 'Mechanical', 'Other']
   ```

5. **If you see fewer departments:**
   - Wait 5 seconds
   - Refresh the page
   - Departments should auto-populate

### Option 3: Manual Database Insert (Advanced)

If the above don't work, manually insert departments:

1. **Connect to MongoDB:**
   ```bash
   mongosh
   use alumni-connect
   ```

2. **Insert departments:**
   ```javascript
   db.departments.insertMany([
     { name: 'CSE', code: 'CSE' },
     { name: 'AI-DS', code: 'AI-DS' },
     { name: 'E&TC', code: 'E&TC' },
     { name: 'Mechanical', code: 'Mechanical' },
     { name: 'Civil', code: 'Civil' },
     { name: 'Other', code: 'Other' }
   ])
   ```

3. **Verify:**
   ```javascript
   db.departments.find()
   ```

4. **Exit and restart backend**

## Verification

After applying the fix:

1. **Go to Events page**
2. **Click "Create Event"**
3. **Select "Student" role**
4. **Click "Add Combination"**
5. **Open Department dropdown**

**Expected Result:**
```
Select Department
AI-DS
CSE
Civil
E&TC
Mechanical
Other
```

## Why This Happened

The Department collection was empty or only had 2 departments. The new code ensures:
- Default departments are always created on first request
- User-registered departments are automatically added
- System auto-syncs on every request

## Prevention

This won't happen again because:
- ✅ Auto-sync on every `/api/search/departments` request
- ✅ Default departments created automatically
- ✅ Fallback to defaults if database fails
- ✅ Works across server restarts

## Still Not Working?

If departments still don't appear:

1. **Check backend logs:**
   ```
   Look for: "Departments fetch error"
   ```

2. **Check browser console:**
   ```
   Look for: "Fetched departments: [...]"
   ```

3. **Verify MongoDB is running:**
   ```bash
   mongosh
   show dbs
   ```

4. **Check environment variables:**
   ```bash
   echo $MONGO_URI
   ```

5. **Try clearing browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

## Contact

If issue persists, provide:
- Backend console logs
- Browser console logs
- MongoDB connection status
- Output of: `node scripts/initDepartments.js`
