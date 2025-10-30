# Event Notification & Filtering Fix

## Issues Fixed

### 1. ✅ Events Not Showing to Targeted Audience
**Problem:** Students/Teachers/Alumni couldn't see events created for them.

**Root Cause:** The `listEvents` function was using the old `audience` field instead of the new targeting system (`target_roles`, `target_student_combinations`, etc.).

**Solution:** Updated filtering logic to use the new targeting fields:
- **Students:** See events where `target_roles` includes 'student' AND their `department + year` matches `target_student_combinations`
- **Teachers:** See events where `target_roles` includes 'teacher' AND their `department` is in `target_teacher_departments`
- **Alumni:** See events where `target_roles` includes 'alumni' AND their `department + graduationYear` matches `target_alumni_combinations`
- **Admin:** See all events (active + pending)

### 2. ✅ No Real-Time Notifications
**Problem:** Users weren't receiving notifications when events were created.

**Solution:** 
- Added notification creation for targeted users
- Emit Socket.io events to user-specific rooms
- Notifications include clickable link to event

### 3. ✅ Alumni Events - Approval Workflow
**Problem:** Alumni-created events sent notifications immediately, before admin approval.

**Solution:**
- Alumni events are created with `status: 'pending'` and `approved: false`
- Notifications are NOT sent during creation
- When admin approves the event, notifications are sent to all targeted users
- Real-time Socket.io notifications emitted on approval

### 4. ✅ Notifications Not Clickable
**Problem:** Notifications didn't redirect to the event page.

**Solution:**
- Added `link: /events/${eventId}` to all notifications
- Frontend can now use this link for navigation
- Notifications include `relatedId` for event reference

---

## Implementation Details

### Event Filtering Logic

#### Students
```javascript
{
  status: 'active',
  target_roles: 'student',
  $or: [
    {
      target_student_combinations: {
        $elemMatch: {
          department: user.department,
          year: user.year
        }
      }
    },
    { target_student_combinations: { $size: 0 } } // All students
  ]
}
```

#### Teachers
```javascript
{
  status: 'active',
  target_roles: 'teacher',
  $or: [
    { target_teacher_departments: user.department },
    { target_teacher_departments: { $size: 0 } } // All teachers
  ]
}
```

#### Alumni
```javascript
{
  status: 'active',
  target_roles: 'alumni',
  $or: [
    {
      target_alumni_combinations: {
        $elemMatch: {
          department: user.department,
          graduation_year: user.graduationYear
        }
      }
    },
    { target_alumni_combinations: { $size: 0 } } // All alumni
  ]
}
```

---

## Notification Flow

### For Admin/Teacher Created Events
```
1. Event Created → status: 'active', approved: true
2. Find targeted users (students/teachers/alumni matching criteria)
3. Create notifications in database
4. Emit Socket.io "newNotification" event to each user
5. Users receive real-time notification
6. Event appears in their "All Events" list
```

### For Alumni Created Events
```
1. Event Created → status: 'pending', approved: false
2. NO notifications sent yet
3. Event appears in Admin's "Pending Approval" tab
4. Admin clicks "Approve"
5. Event status → 'active', approved: true
6. Find targeted users
7. Create notifications in database
8. Emit Socket.io "newNotification" event to each user
9. Users receive real-time notification
10. Event appears in their "All Events" list
```

---

## Notification Structure

### Database Notification
```javascript
{
  recipient: userId,
  sender: creatorId,
  type: 'event',
  content: 'New event: Event Title',
  relatedId: eventId,
  onModel: 'Event',
  link: '/events/eventId',
  createdAt: Date
}
```

### Socket.io Notification
```javascript
{
  type: 'event',
  title: 'New Event' or 'Event Approved',
  message: 'New event: Event Title',
  link: '/events/eventId',
  relatedId: eventId,
  createdAt: Date
}
```

---

## Frontend Integration

### Listening for Notifications
```javascript
// In your notification component or layout
socket.on('newNotification', (notification) => {
  // Show toast/banner
  toast.info(notification.message, {
    onClick: () => navigate(notification.link)
  });
  
  // Update notification bell count
  setUnreadCount(prev => prev + 1);
  
  // Add to notification list
  setNotifications(prev => [notification, ...prev]);
});
```

### Making Notifications Clickable
```javascript
// In notification list component
<div 
  onClick={() => navigate(notification.link)}
  className="cursor-pointer hover:bg-gray-50"
>
  <p>{notification.content}</p>
  <span className="text-xs text-gray-500">
    {formatDate(notification.createdAt)}
  </span>
</div>
```

---

## Testing Scenarios

### Scenario 1: Teacher Creates Event for CSE Year 2 Students
1. **Teacher** creates event
2. **Target:** Student, CSE, Year 2
3. **Expected:**
   - ✅ All CSE Year 2 students receive notification
   - ✅ Event appears in their "All Events" list
   - ✅ CSE Year 3 students do NOT see the event
   - ✅ AI-DS Year 2 students do NOT see the event

### Scenario 2: Alumni Creates Event
1. **Alumni** creates event
2. **Target:** Student, AI-DS, Year 3
3. **Expected:**
   - ✅ Event status: 'pending'
   - ✅ NO notifications sent yet
   - ✅ Event appears in Admin's "Pending Approval"
   - ✅ Students do NOT see event yet
4. **Admin** approves event
5. **Expected:**
   - ✅ Event status: 'active'
   - ✅ All AI-DS Year 3 students receive notification
   - ✅ Event appears in their "All Events" list

### Scenario 3: Admin Creates Event for Multiple Departments
1. **Admin** creates event
2. **Target:** Student, CSE Year 2, AI-DS Year 3
3. **Expected:**
   - ✅ CSE Year 2 students receive notification
   - ✅ AI-DS Year 3 students receive notification
   - ✅ Event appears for both groups
   - ✅ Other students do NOT see the event

### Scenario 4: Notification Click
1. **Student** receives notification
2. **Clicks** on notification
3. **Expected:**
   - ✅ Redirects to `/events/{eventId}`
   - ✅ Event details page loads
   - ✅ Student can register for event

---

## Files Modified

### Backend
- ✅ `backend/controllers/eventsController.js`
  - Updated `listEvents()` - Fixed filtering logic
  - Updated `createEvent()` - Added notification system
  - Updated `approveEvent()` - Send notifications on approval

### Changes Summary
```javascript
// Before (WRONG)
filter.audience = { $in: [role] };

// After (CORRECT)
filter = {
  status: 'active',
  target_roles: role,
  $or: [
    { target_student_combinations: { $elemMatch: { ... } } },
    { target_student_combinations: { $size: 0 } }
  ]
};
```

---

## Verification Steps

### 1. Test Event Creation (Teacher)
```bash
# Login as Teacher
# Create event for CSE Year 2
# Check: CSE Year 2 students receive notification
# Check: Event appears in student's "All Events"
```

### 2. Test Alumni Approval Flow
```bash
# Login as Alumni
# Create event for AI-DS Year 3
# Check: Event status is 'pending'
# Check: NO notifications sent
# Login as Admin
# Approve event
# Check: AI-DS Year 3 students receive notification
# Check: Event appears in student's "All Events"
```

### 3. Test Notification Click
```bash
# Login as Student
# Receive notification
# Click notification
# Check: Redirects to event details page
```

### 4. Test Filtering
```bash
# Login as CSE Year 2 student
# Go to Events page
# Check: Only see events targeting CSE Year 2
# Check: Do NOT see events for other departments/years
```

---

## Socket.io Event Names

- **`newNotification`** - Sent when new notification is created
- **Room:** `userId.toString()` - Each user has their own room

### Server-Side Emit
```javascript
req.io.to(userId.toString()).emit("newNotification", {
  type: 'event',
  title: 'New Event',
  message: 'New event: Event Title',
  link: '/events/eventId',
  relatedId: eventId,
  createdAt: new Date()
});
```

### Client-Side Listen
```javascript
socket.on('newNotification', (notification) => {
  // Handle notification
});
```

---

## Database Queries

### Find Targeted Students
```javascript
const students = await User.find({
  role: 'student',
  $or: [
    { department: 'CSE', year: 2 },
    { department: 'AI-DS', year: 3 }
  ]
}).select('_id');
```

### Find Targeted Teachers
```javascript
const teachers = await User.find({
  role: 'teacher',
  department: { $in: ['CSE', 'AI-DS'] }
}).select('_id');
```

### Find Targeted Alumni
```javascript
const alumni = await User.find({
  role: 'alumni',
  $or: [
    { department: 'CSE', graduationYear: 2023 },
    { department: 'AI-DS', graduationYear: 2024 }
  ]
}).select('_id');
```

---

## Summary

✅ **Events now show to correct audience** based on department/year targeting
✅ **Real-time notifications** sent to targeted users
✅ **Alumni events require approval** before notifications are sent
✅ **Notifications are clickable** and redirect to event page
✅ **Proper filtering** ensures students only see relevant events
✅ **Socket.io integration** for real-time updates

All issues have been fixed! Restart your backend server to apply the changes.
