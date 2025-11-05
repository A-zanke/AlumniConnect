# Fix Empty Messages - Debug Guide

## The Problem

Messages are encrypted ✅ but showing as **empty** ❌ because they're not being decrypted.

## Why This Happens

```
content: ''  ← Encrypted messages stored with empty content
encrypted: true
encryptionData: { ... }  ← The actual encrypted data
```

The decryption code should be running but it's NOT.

## What I Just Added

I added logging to see WHY decryption isn't running:

```javascript
🔍 Checking message: { 
  id: '...', 
  encrypted: true/false,  ← Is this field present?
  hasEncryptionData: true/false,  ← Is this field present?
  content: '...' 
}
```

## Do This Now

1. **Refresh browser** (Ctrl + Shift + R)
2. **Open console** (F12)
3. **Select a chat** with messages
4. **Look for this log:**

```
📋 Sample message structure: { ... full message object ... }
```

## What We're Looking For

### ✅ If You See This:
```
🔍 Checking message: { id: '123', encrypted: true, hasEncryptionData: true, content: '' }
🔓 Decrypting message: 123
✅ Decrypted: hello world
```
→ **Decryption is working!** If message still doesn't show, it's a rendering issue.

### ❌ If You See This:
```
🔍 Checking message: { id: '123', encrypted: false, hasEncryptionData: false, content: '' }
```
→ **Backend isn't sending encryption data!** The API response is missing `encrypted` and `encryptionData` fields.

### ❌ If You See This:
```
🔍 Checking message: { id: '123', encrypted: true, hasEncryptionData: false, content: '' }
```
→ **`encryptionData` is null or undefined!** The backend has the flag but not the actual encrypted data.

## Solutions Based on What You See

### If encrypted=false:
- Check MongoDB - is the message actually encrypted there?
- If yes → Backend API isn't returning the fields
- If no → Message was sent before encryption was working

### If hasEncryptionData=false:
- Check MongoDB - does the message have encryptionData?
- The field might be stored but not returned by API

### If both are true but still empty:
- Decryption IS running
- The decrypted content isn't being set properly
- Check rendering code

---

**Refresh and send me the console output!** 🔍
