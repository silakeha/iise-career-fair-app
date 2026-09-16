# How to Verify Firestore Rules Are Deployed

If you're still getting permission errors even though the `config/organizers` document exists, follow these steps to verify your rules are correctly deployed:

## Step 1: Check Rules in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `iise-care`
3. Click **Firestore Database** → **Rules** tab
4. Look for this section in the rules:

```javascript
// Config collection (for floor plan configuration)
match /config/{configId} {
  // Everyone authenticated can read config
  allow read: if isAuthenticated();
  
  // Only organizers can write config
  allow write: if isOrganizer();
}
```

**If this section is missing or different, your rules are not deployed correctly.**

## Step 2: Verify Rules Match Your File

1. Open `firestore.rules` from your project
2. Compare it line-by-line with what's in Firebase Console
3. They should be **exactly the same**

## Step 3: Check Authentication Status

1. In Firebase Console, go to **Authentication** → **Users**
2. Verify you see your user account
3. Make sure you're logged into your app with the same email

## Step 4: Test Rules Directly

You can test if the rules work by:

1. Open your app in the browser
2. Open browser DevTools (F12)
3. Go to Console tab
4. Make sure you're logged in
5. Try this in the console:

```javascript
// This should work if rules are correct
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase'; // adjust path as needed

const testDoc = await getDoc(doc(db, 'config', 'organizers'));
console.log('Success!', testDoc.exists());
```

If this fails with permission error, the rules aren't working.

## Common Issues

### Issue 1: Rules Not Actually Published
- **Symptom**: Rules look correct in editor but don't work
- **Solution**: Make sure you clicked **Publish** button, not just Save

### Issue 2: Wrong Project
- **Symptom**: Rules deployed to wrong Firebase project
- **Solution**: Verify you're in the `iise-care` project

### Issue 3: Rules Syntax Error
- **Symptom**: Rules won't publish or have errors
- **Solution**: Copy exact content from `firestore.rules` file

### Issue 4: Auth Token Not Ready
- **Symptom**: Permission error right after login
- **Solution**: Wait a moment after login, or refresh the page

## Quick Fix: Re-deploy Rules

If you're unsure, just re-deploy:

1. Copy ALL content from `firestore.rules`
2. Go to Firebase Console → Firestore → Rules
3. Select all and delete
4. Paste your rules
5. Click **Publish**
6. Wait 10-20 seconds for rules to propagate
7. Refresh your app

## Verify Rules Are Active

After deploying, you should see:
- No permission errors in console
- App loads normally
- You can read from `config/organizers` if you're logged in

If you still get errors after verifying all of the above, there might be a deeper issue with your Firebase project permissions.
