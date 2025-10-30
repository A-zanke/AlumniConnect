# Department System - Complete Documentation

## Overview
The department system ensures that all departments from the Register Page are always available in the Event creation page, plus any additional departments added by registered users.

## Architecture

### Source of Truth
**Location:** `frontend/src/pages/RegisterPage.js`
```javascript
const departments = ['CSE', 'AI-DS', 'E&TC', 'Mechanical', 'Civil', 'Other'];
```

These departments are:
1. Defined in `backend/config/departments.js` (backend configuration)
2. Used in `frontend/src/pages/RegisterPage.js` (registration form)
3. Used as fallback in `frontend/src/pages/EventsPage.js` (event creation)

### How It Works

#### 1. **User Registration**
When a user registers:
- Selects department from dropdown in RegisterPage
- Backend receives the department
- Department is automatically created in `Department` collection if it doesn't exist
- User's department is stored in `User` collection

#### 2. **Department Fetching** (`GET /api/search/departments`)
When Event page loads:

**Step 1:** Ensure default departments exist
```javascript
// Creates: CSE, AI-DS, E&TC, Mechanical, Civil, Other
for (const dept of DEFAULT_DEPARTMENTS) {
  await Department.findOrCreate(dept);
}
```

**Step 2:** Get unique departments from registered users
```javascript
const userDepartments = await User.distinct('department');
```

**Step 3:** Add user departments to collection
```javascript
for (const dept of userDepartments) {
  await Department.findOrCreate(dept);
}
```

**Step 4:** Return merged list (sorted)
```javascript
// Returns: Default departments + User departments (all unique, sorted)
const allDepartments = await Department.find().sort({ name: 1 });
```

#### 3. **Event Creation**
When creating an event:
- Department dropdown shows all departments (defaults + user-added)
- Admin/Teacher can select multiple departments and years
- Alumni can select departments only (no year filter)
- Students see events only from their department + year

## Database Schema

### Department Model
```javascript
{
  name: String (required, unique),
  code: String (optional, sparse index),
  createdAt: Date,
  updatedAt: Date
}
```

### User Model (relevant fields)
```javascript
{
  department: String,
  year: Number (for students),
  graduationYear: Number (for alumni)
}
```

### Event Model (relevant fields)
```javascript
{
  target_roles: ['student', 'teacher', 'alumni'],
  target_student_combinations: [
    { department: String, year: Number }
  ],
  target_teacher_departments: [String],
  target_alumni_combinations: [
    { department: String, graduation_year: Number }
  ]
}
```

## API Endpoints

### Get Departments
```
GET /api/search/departments
```

**Response:**
```json
[
  "AI-DS",
  "CSE",
  "Civil",
  "E&TC",
  "Mechanical",
  "Other"
]
```

**Features:**
- ✅ Always includes default departments from RegisterPage
- ✅ Includes departments from registered users
- ✅ Auto-syncs on every request
- ✅ Sorted alphabetically
- ✅ No duplicates
- ✅ Fallback to defaults on error

## Files Modified/Created

### Created Files
1. **`backend/config/departments.js`**
   - Central configuration for default departments
   - Single source of truth for backend

2. **`backend/scripts/populateDepartments.js`**
   - Utility to manually sync departments
   - Run once to populate from existing users

3. **`DEPARTMENT_SYSTEM.md`** (this file)
   - Complete documentation

### Modified Files
1. **`backend/models/Department.js`**
   - Added `code` field
   - Added `findOrCreate()` static method
   - Added timestamps

2. **`backend/routes/searchRoutes.js`**
   - Updated `/api/search/departments` endpoint
   - Auto-syncs default + user departments
   - Always returns complete list

3. **`backend/routes/eventsRoutes.js`**
   - Fixed route ordering
   - `/registered/mine` now works correctly

4. **`frontend/src/pages/EventsPage.js`**
   - Updated default departments
   - Added year 5 for some programs
   - Extended graduation years

## Usage Examples

### For Developers

#### Adding New Default Department
1. Update `backend/config/departments.js`:
```javascript
const DEFAULT_DEPARTMENTS = [
  'CSE',
  'AI-DS',
  'E&TC',
  'Mechanical',
  'Civil',
  'Electrical', // NEW
  'Other'
];
```

2. Update `frontend/src/pages/RegisterPage.js`:
```javascript
const departments = [
  'CSE',
  'AI-DS',
  'E&TC',
  'Mechanical',
  'Civil',
  'Electrical', // NEW
  'Other'
];
```

3. Restart server - departments will auto-sync

#### Manually Sync Departments
```bash
cd backend
node scripts/populateDepartments.js
```

### For Users

#### Student Registration
1. Go to Register Page
2. Select department from dropdown
3. Department is automatically added to system
4. Available in Event creation immediately

#### Event Creation
1. Go to Events Page → Create Event
2. Select "Target Audience"
3. Choose departments from dropdown
4. All registered departments appear
5. Select years for students (if applicable)

## Event Visibility Rules

### Students
See events where:
- `target_roles` includes 'student'
- AND their `department` + `year` matches `target_student_combinations`

**Example:**
```javascript
// Student: CSE, Year 2
// Sees events with:
target_student_combinations: [
  { department: 'CSE', year: 2 }
]
```

### Teachers
See events where:
- `target_roles` includes 'teacher'
- AND their `department` is in `target_teacher_departments`

**Example:**
```javascript
// Teacher: CSE Department
// Sees events with:
target_teacher_departments: ['CSE']
```

### Alumni
See events where:
- `target_roles` includes 'alumni'
- AND their `department` + `graduationYear` matches `target_alumni_combinations`

**Example:**
```javascript
// Alumni: CSE, Graduated 2023
// Sees events with:
target_alumni_combinations: [
  { department: 'CSE', graduation_year: 2023 }
]
```

### Admin
- Sees ALL events (no filtering)

## Future-Proof Design

### Automatic Syncing
✅ **Every time `/api/search/departments` is called:**
1. Default departments are ensured to exist
2. User departments are synced
3. Complete merged list is returned

✅ **Every time a user registers:**
1. Their department is automatically added to Department collection
2. Available immediately for event creation

### No Manual Intervention Needed
- ✅ Departments auto-sync on every request
- ✅ New user departments automatically appear
- ✅ Default departments always present
- ✅ No database migrations required
- ✅ Works across server restarts

### Scalability
- ✅ Handles unlimited departments
- ✅ Efficient database queries (indexed)
- ✅ Cached in Department collection
- ✅ Sorted alphabetically
- ✅ No duplicates

## Testing Checklist

### Department Fetching
- [ ] Register new user with department "CSE"
- [ ] Go to Events page
- [ ] Click "Create Event"
- [ ] Verify "CSE" appears in department dropdown
- [ ] Register user with custom department "Biotech"
- [ ] Refresh Events page
- [ ] Verify "Biotech" now appears in dropdown

### Event Creation
- [ ] Create event targeting "CSE Year 2"
- [ ] Login as CSE Year 2 student
- [ ] Verify event appears in "All Events"
- [ ] Login as CSE Year 3 student
- [ ] Verify event does NOT appear

### Department Persistence
- [ ] Restart backend server
- [ ] Go to Events page
- [ ] Verify all departments still appear
- [ ] No departments lost

### Error Handling
- [ ] Stop MongoDB
- [ ] Try to fetch departments
- [ ] Verify default departments are returned
- [ ] No errors in console

## Troubleshooting

### Issue: Only 2 departments showing
**Solution:** 
- Restart backend server
- Departments will auto-sync on first request
- Or run: `node scripts/populateDepartments.js`

### Issue: New department not appearing
**Solution:**
- Check if user registered with that department
- Refresh Events page
- Department should appear immediately

### Issue: Department collection empty
**Solution:**
- Visit Events page once
- Departments will auto-populate
- Or run sync script

### Issue: Duplicate departments
**Solution:**
- Unique constraint prevents duplicates
- System handles gracefully
- No action needed

## Summary

The department system is now:
- ✅ **Future-proof** - Auto-syncs forever
- ✅ **Self-healing** - Recovers from errors
- ✅ **User-driven** - Grows with registrations
- ✅ **Developer-friendly** - Easy to maintain
- ✅ **Reliable** - Always returns valid data

**Key Principle:** 
> "Whatever departments users select during registration will always be available in event creation, plus the default departments from RegisterPage."

This ensures the system works correctly now and in the future, with zero manual intervention required.
