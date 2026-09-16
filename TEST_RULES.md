# Test Firestore Rules

If you're still getting permission errors, follow these steps to verify and fix:

## Step 1: Verify Rules in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `iise-care`
3. Click **Firestore Database** → **Rules** tab
4. **Look for this exact section:**

```javascript
// Config collection (for floor plan configuration)
match /config/{configId} {
  // Allow public read of organizer emails (needed during signup/login before auth)
  // Security: Email list isn't sensitive - role assignment is protected by user rules
  allow read: if configId == 'organizers';
  
  // Other config documents require authentication
  allow read: if configId != 'organizers' && isAuthenticated();
  
  // Only organizers can write to config (including organizer emails list)
  allow write: if isOrganizer();
}
```

**If you don't see this, the rules aren't deployed correctly.**

## Step 2: Re-Deploy Rules

1. Open `firestore.rules` from your project
2. Copy **ALL** the content (Cmd+A, Cmd+C)
3. In Firebase Console → Firestore → Rules:
   - Select all existing text (Cmd+A)
   - Delete it
   - Paste your rules (Cmd+V)
   - **Click "Publish"** (not just Save!)
4. Wait 30 seconds for rules to propagate

## Step 3: Clear Browser Cache

1. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. Or clear browser cache completely
3. Close and reopen the browser

## Step 4: Test in Browser Console

Open your app and browser console (F12), then try:

```javascript
// This should work now (even without being logged in)
fetch('https://firestore.googleapis.com/v1/projects/iise-care/databases/(default)/documents/config/organizers')
  .then(r => r.json())
  .then(d => console.log('SUCCESS!', d))
  .catch(e => console.error('FAILED:', e));
```

If this fails, the rules still aren't working.

## Step 5: Verify Document Exists

1. Go to Firebase Console → Firestore Database
2. Navigate to `config` collection
3. Click on `organizers` document
4. Verify it has an `emails` field (array type)
5. If it doesn't exist, create it (see `CREATE_CONFIG_COLLECTION.md`)

## Common Issues

### Issue: Rules won't publish
- **Check**: Look for syntax errors (red underlines in Firebase Console)
- **Solution**: Copy exact content from `firestore.rules` - don't modify it

### Issue: Rules publish but still get errors
- **Wait**: Rules can take 30-60 seconds to propagate globally
- **Try**: Log out completely, close browser, reopen, log back in

### Issue: "Permission denied" even after deploying
- **Check**: Make sure you clicked "Publish", not just saved
- **Verify**: The rules in Console match your `firestore.rules` file exactly
- **Try**: Create a new test document to verify rules are active

## Quick Fix: Make Rules Even Simpler

If nothing works, try this ultra-simple rule temporarily:

```javascript
match /config/organizers {
  allow read: if true;  // Public read
  allow write: if false; // No writes for now
}
```

Add this as a separate match block in your rules to test. If this works, then the issue is with the conditional logic.
