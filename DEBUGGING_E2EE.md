# Debugging E2EE Encryption Issue

## Problem
Messages in MongoDB show:
- `encrypted: false`
- `content: "hlo admin"` (plaintext visible)
- Encryption is not working

## Debugging Steps

### Step 1: Check Browser Console

1. **Open your frontend in browser**
2. **Open Developer Tools** (F12)
3. **Go to Console tab**
4. **Send a message**
5. **Look for these logs:**

```
[E2EE] Initializing encryption for user: ...
[E2EE] Keys initialized: { newKeys: true/false, hasPublicKey: true, hasPrivateKey: true }
[E2EE] Encryption ready!
[E2EE] Encryption attempt: { isReady: true, hasPublicKey: true, hasPrivateKey: true }
[E2EE] Recipient public key fetched: true/false
[E2EE] Starting encryption...
[E2EE] Message encrypted successfully: true
```

### Step 2: Common Issues and Solutions

#### Issue 1: "Encryption not ready"
**Symptoms:**
```
[E2EE] Encryption not ready, sending unencrypted message
```

**Solution:**
- Keys haven't been generated yet
- Wait 2-3 seconds after page load
- Refresh the page and try again

#### Issue 2: "Recipient public key not available"
**Symptoms:**
```
[E2EE] Recipient public key not available, sending unencrypted
```

**Solution:**
- Recipient hasn't logged in yet to generate their keys
- Ask recipient to:
  1. Log in to the app
  2. Wait for keys to generate
  3. Send them a message first (this triggers key generation)

#### Issue 3: Web Crypto API not available
**Symptoms:**
```
Error: crypto.subtle is undefined
```

**Solution:**
- Use HTTPS (not HTTP) or localhost
- Check if browser supports Web Crypto API
- Try a modern browser (Chrome, Firefox, Safari, Edge)

### Step 3: Manual Test

1. **Open browser console**
2. **Run:**
```javascript
// Import the test utility
import('./utils/testEncryption.js').then(() => {
  testEncryption();
});
```

3. **Expected output:**
```
🔐 Testing E2EE Encryption...
Step 1: Generating key pairs...
✅ Keys generated successfully
Step 2: Encrypting message...
✅ Message encrypted
Step 3: Decrypting message...
✅ Message decrypted
Step 4: Verification...
✅✅✅ SUCCESS! Encryption working perfectly!
```

### Step 4: Check LocalStorage

1. **Open Developer Tools > Application tab**
2. **Go to Local Storage**
3. **Look for these keys:**
   - `e2ee_public_{userId}` - Should have a long Base64 string
   - `e2ee_private_{userId}` - Should have a long Base64 string

4. **If missing:**
   - Clear localStorage
   - Refresh page
   - Wait for keys to generate

### Step 5: Check Database

**In MongoDB, check User collection:**

```javascript
db.users.findOne({ _id: ObjectId("your_user_id") }, { publicKey: 1 })
```

**Expected:**
```json
{
  "_id": "...",
  "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
}
```

**If `publicKey` is null or empty:**
- User hasn't generated keys yet
- Check browser console for errors
- Try clearing localStorage and refreshing

### Step 6: Test with Two Users

1. **User 1:**
   - Log in
   - Wait 3 seconds for keys to generate
   - Check console for "[E2EE] Encryption ready!"

2. **User 2:**
   - Log in (different browser/incognito)
   - Wait 3 seconds for keys to generate
   - Check console for "[E2EE] Encryption ready!"

3. **User 1 sends message to User 2:**
   - Watch console logs
   - Should see encryption logs
   - Check MongoDB - message should be encrypted

### Step 7: Verify MongoDB Document

**After sending encrypted message, check:**

```javascript
db.messages.findOne({}, { 
  encrypted: 1, 
  content: 1, 
  encryptionData: 1 
}).sort({ createdAt: -1 })
```

**Expected (ENCRYPTED):**
```json
{
  "encrypted": true,
  "content": "",
  "encryptionData": {
    "version": "v1",
    "encryptedContent": "base64_string_here...",
    "encryptedKey": "base64_string_here...",
    "iv": "base64_string_here...",
    "isGroup": false
  }
}
```

**Current (UNENCRYPTED):**
```json
{
  "encrypted": false,
  "content": "hlo admin",
  "encryptionData": null
}
```

## Quick Fix Checklist

- [ ] Both users have logged in at least once
- [ ] Browser console shows "[E2EE] Encryption ready!"
- [ ] LocalStorage has encryption keys
- [ ] Database has public keys for both users
- [ ] Using HTTPS or localhost (for Web Crypto API)
- [ ] Modern browser (Chrome 37+, Firefox 34+, Safari 11+)
- [ ] No errors in console

## Force Key Regeneration

If keys are corrupted, regenerate them:

```javascript
// In browser console
localStorage.removeItem('e2ee_public_' + USER_ID);
localStorage.removeItem('e2ee_private_' + USER_ID);
location.reload();
```

## Still Not Working?

1. **Clear all data:**
```javascript
localStorage.clear();
location.reload();
```

2. **Check API endpoint:**
```javascript
// Test if public key endpoint works
fetch('/api/users/encryption/public-key', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  },
  body: JSON.stringify({ publicKey: 'test123' })
}).then(r => r.json()).then(console.log);
```

3. **Enable verbose logging:**
   - Already enabled in updated code
   - Check console for all [E2EE] prefixed logs

## Success Indicators

✅ Console shows: `[E2EE] Message encrypted successfully: true`
✅ MongoDB shows: `encrypted: true`
✅ MongoDB shows: `content: ""` (empty)
✅ MongoDB shows: `encryptionData` object with base64 strings
✅ Messages decrypt correctly in UI
✅ Shield icon visible in chat header

---

**Note:** If you see the message "Encryption not ready" or "Recipient public key not available", the system will fallback to unencrypted messages to avoid blocking communication. This is by design for better UX.
