# Setting Up Organizer Emails in Firestore

This guide shows you how to set up organizer emails in Firestore so they're not visible in your client-side code.

## Step 1: Create the Organizer Config Document

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `iise-care`
3. Click on **Firestore Database** in the left sidebar
4. Click **Start collection** (if you don't have a `config` collection yet)
5. **Collection ID**: `config`
6. **Document ID**: `organizers`
7. Click **Add field**:
   - **Field name**: `emails`
   - **Type**: Select **array**
   - **Value**: Add your organizer emails one by one:
     - Click **Add item**
     - Enter: `organizer@iisecareerfair.com`
     - Click **Add item** again
     - Enter: `admin@iisecareerfair.com`
     - Add more as needed
8. Click **Save**

## Step 2: Verify Firestore Rules

Your Firestore rules should already allow authenticated users to read organizer emails. Check `firestore.rules`:

```javascript
match /config/organizers {
  allow read: if isAuthenticated();
  allow write: if isOrganizer();
}
```

If you need to update the rules:

```bash
firebase deploy --only firestore:rules
```

## Step 3: Test

1. Start your app: `npm start`
2. Try logging in with an organizer email
3. The app should fetch organizer emails from Firestore
4. Check the browser console for any errors

## Adding/Removing Organizer Emails

### Via Firebase Console:

1. Go to Firestore Database
2. Navigate to `config` → `organizers`
3. Click on the document
4. Edit the `emails` array field
5. Add or remove email addresses
6. Click **Update**

### Via Code (Organizers Only):

Organizers can manage this through a future admin panel, or you can create a simple script to update it.

## Important Notes

- **Cache**: The app caches organizer emails for 5 minutes to reduce Firestore reads
- **Security**: Only authenticated users can read organizer emails (they need to be logged in)
- **Updates**: Changes to organizer emails take effect within 5 minutes (cache duration)
- **Fallback**: If Firestore read fails, the app will use an empty array (no emails will be recognized as organizers)

## Troubleshooting

**Problem**: Organizer emails not working after setup
- **Solution**: Clear browser cache and reload
- **Check**: Verify the document exists at `config/organizers` in Firestore
- **Verify**: Check browser console for Firestore errors

**Problem**: "Permission denied" error
- **Solution**: Make sure Firestore rules are deployed: `firebase deploy --only firestore:rules`
- **Check**: Verify you're logged in when testing

**Problem**: Changes not taking effect
- **Solution**: Wait up to 5 minutes (cache duration) or clear browser cache
- **Alternative**: Hard refresh the page (Cmd+Shift+R or Ctrl+Shift+R)
