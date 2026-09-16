# How to Deploy Firestore Rules

The permission error occurs because your Firestore security rules need to be deployed to Firebase. Here's how to do it:

## Method 1: Deploy via Firebase Console (Easiest - No CLI needed)

### Step 1: Open Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `iise-care`

### Step 2: Open Firestore Rules
1. Click on **Firestore Database** in the left sidebar
2. Click on the **Rules** tab at the top of the page

### Step 3: Copy Your Rules
1. Open the `firestore.rules` file from your project folder
2. Select all the text (Cmd+A or Ctrl+A)
3. Copy it (Cmd+C or Ctrl+C)

### Step 4: Paste and Deploy
1. In the Firebase Console Rules editor, select all existing text
2. Paste your rules (Cmd+V or Ctrl+V)
3. Click the **Publish** button at the top right

### Step 5: Verify
You should see a success message. The rules are now active!

---

## Method 2: Deploy via Firebase CLI

If you have Firebase CLI installed and authenticated:

### Step 1: Authenticate (if needed)
```bash
firebase login --reauth
```

### Step 2: Deploy Rules
```bash
firebase deploy --only firestore:rules
```

---

## What the Rules Do

Your `firestore.rules` file includes:

```javascript
// Config collection - allows authenticated users to read
match /config/{configId} {
  allow read: if isAuthenticated();  // ✅ This allows reading organizer emails
  allow write: if isOrganizer();
}
```

This rule allows any authenticated user to read from the `config` collection, which includes the `organizers` document.

---

## After Deploying

1. **Refresh your browser** (hard refresh: Cmd+Shift+R or Ctrl+Shift+R)
2. **Log out and log back in** to your app
3. The permission error should be gone!

---

## Troubleshooting

**Problem**: Still getting permission errors after deploying
- **Solution**: Make sure you're logged into your app (authentication is required)
- **Check**: Verify the `config/organizers` document exists in Firestore
- **Try**: Log out and log back in to refresh the auth token

**Problem**: Can't find the Rules tab
- **Solution**: Make sure you're in Firestore Database, not Realtime Database
- **Check**: You need to have the correct permissions on the Firebase project

**Problem**: Rules won't publish
- **Check**: Make sure there are no syntax errors in the rules
- **Solution**: Copy the exact content from `firestore.rules` file

---

## Quick Checklist

- [ ] Opened Firebase Console
- [ ] Selected project: `iise-care`
- [ ] Went to Firestore Database → Rules tab
- [ ] Copied rules from `firestore.rules` file
- [ ] Pasted into Rules editor
- [ ] Clicked "Publish"
- [ ] Refreshed browser
- [ ] Logged out and back in

After completing these steps, the permission error should be resolved!
