# Permanent Profile Deletion - API Reference

## Endpoint

```
DELETE /api/users/account
```

## Authentication
- **Required**: Yes
- **Method**: Bearer Token (JWT)
- **Header**: `Authorization: Bearer <token>`

## Authorization
- Users can only delete their own account
- The user ID from the JWT token is used to identify the account to delete

## Request Example

```bash
curl -X DELETE http://localhost:5000/api/users/account \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## JavaScript/Fetch Example

```javascript
async function deleteMyAccount() {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await fetch('/api/users/account', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('Account deleted:', data.message);
      // Redirect to login
      window.location.href = '/login';
    } else {
      console.error('Error:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}
```

## React Component Example

```jsx
import React, { useState } from 'react';

function DeleteAccountButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleDelete = async () => {
    const confirmed = window.confirm(
      '⚠️ WARNING: This will permanently delete your account and ALL associated data. This cannot be undone. Are you sure?'
    );
    
    if (!confirmed) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/users/account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Clear auth token and redirect
        localStorage.removeItem('authToken');
        window.location.href = '/';
      } else {
        setError(data.message || 'Failed to delete account');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <button 
        onClick={handleDelete} 
        disabled={loading}
        style={{ backgroundColor: '#dc3545', color: 'white', padding: '10px 20px' }}
      >
        {loading ? 'Deleting...' : 'Delete Account'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default DeleteAccountButton;
```

## Response - Success (200 OK)

```json
{
  "success": true,
  "message": "Account permanently deleted successfully. All associated data has been removed."
}
```

## Response - User Not Found (404)

```json
{
  "success": false,
  "message": "User not found"
}
```

## Response - Server Error (500)

```json
{
  "success": false,
  "message": "Failed to delete account. Please try again later.",
  "error": "Error message here (only in development mode)"
}
```

## What Gets Deleted

The following data is permanently removed from the database:

### Direct Deletions
- User account document
- All posts created by the user
- All messages (sent and received)
- All notifications
- All blocks (where user blocked or was blocked)
- All connections
- All connection requests
- All events organized by the user
- All event registrations by the user
- All forum posts
- All forum comments
- All forum reports
- All message reports
- All post reports

### Array Cleanup (User references removed)
- Removed from other users' connections arrays
- Removed from other users' followers arrays
- Removed from other users' following arrays
- Removed from other users' connection requests arrays
- Removed from other users' bookmarked posts arrays

## Important Notes

⚠️ **PERMANENT**: This action cannot be undone. All data is permanently deleted.

⚠️ **NO RECOVERY**: There is no backup or recovery mechanism. Consider downloading data before deletion.

⚠️ **AUTOMATIC LOGOUT**: After successful deletion, the user should be redirected to login and their session cleared.

⚠️ **CONCURRENT REQUESTS**: The endpoint uses transactions to ensure data consistency. If multiple delete requests are sent simultaneously, only one will succeed.

## Implementation Details

### Technology
- **Language**: Node.js / JavaScript
- **Database**: MongoDB
- **Safety Feature**: MongoDB Transactions (all-or-nothing deletion)

### Performance
- **Operation Time**: Typically 1-3 seconds depending on user data volume
- **Database Queries**: ~15-20 separate queries (bundled in a single transaction)
- **Network Latency**: Standard HTTP latency

### Error Handling
- If any step fails, the entire transaction is rolled back
- No partial deletion occurs
- Clear error messages are returned to the client
- Errors are logged on the server for debugging

## Recommended Frontend Flow

1. **Confirmation Dialog**: Ask user to confirm deletion
2. **Warning**: Show clear warning about permanence
3. **Loading State**: Show loading indicator during deletion
4. **Success**: Redirect to login page
5. **Error**: Display error message and keep user on page
6. **Logout**: Clear all local authentication tokens

## Integration Checklist

- [ ] Add delete account button to profile settings page
- [ ] Add confirmation dialog with warning
- [ ] Clear auth token after successful deletion
- [ ] Redirect to login page
- [ ] Display appropriate error messages
- [ ] Add loading state during deletion
- [ ] Test in development environment
- [ ] Test with various user data scenarios

## Suggested UI Text

```
Delete Account

This action is permanent and cannot be undone.

When you delete your account:
- Your profile will be permanently removed
- All your posts, messages, and connections will be deleted
- Other users will no longer see your profile
- Your data will be removed from all backups within 30 days

This action cannot be reversed. Please be certain.

[Cancel Button] [Delete Account Button]
```
