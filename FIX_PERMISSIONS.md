# Fix: Missing or Insufficient Permissions Error

If you're getting "Missing or insufficient permissions" when trying to fetch organizer emails, follow these steps:

## Solution: Deploy Firestore Rules

The rules are configured correctly in `firestore.rules`, but they need to be deployed to Firebase.

### Option 1: Deploy via Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `iise-care`
3. Click on **Firestore Database** in the left sidebar
4. Click on the **Rules** tab at the top
5. Open the `firestore.rules` file from your project
6. Copy **ALL** the contents of `firestore.rules`
7. Paste it into the Rules editor in Firebase Console
8. Click **Publish**

### Option 2: Deploy via Firebase CLI

If you have Firebase CLI set up:

```bash
# First, re-authenticate if needed
firebase login --reauth

# Then deploy the rules
firebase deploy --only firestore:rules
```

## Verify the Rules Are Correct

After deploying, your rules should include this section:

```javascript
// Config collection (for floor plan configuration)
match /config/{configId} {
  // Everyone authenticated can read config
  allow read: if isAuthenticated();
  
  // Only organizers can write config
  allow write: if isOrganizer();
}
```

This allows any authenticated user to read from the `config` collection, including the `organizers` document.

## Troubleshooting

**Problem**: Still getting permission errors after deploying
- **Check**: Are you logged in? The rules require authentication
- **Check**: Did you create the `config/organizers` document? (See `CREATE_CONFIG_COLLECTION.md`)
- **Solution**: Try logging out and logging back in

**Problem**: Rules won't deploy
- **Check**: Make sure you're logged into Firebase Console with the correct account
- **Check**: Verify you have permission to modify Firestore rules for this project
- **Solution**: Contact the project owner if you don't have permissions

**Problem**: "Circular dependency" error
- **Note**: The rules use helper functions that read from Firestore. This is normal and should work.
- **Solution**: Make sure the rules are deployed exactly as shown in `firestore.rules`

## Quick Test

After deploying the rules:

1. Make sure you're logged into your app
2. Try accessing the organizer dashboard
3. Check the browser console - the permission error should be gone
4. If you still see errors, check that the `config/organizers` document exists in Firestore
