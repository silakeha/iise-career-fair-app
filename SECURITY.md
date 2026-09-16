# Security Guide

This document explains how to secure sensitive information in your IISECareerFair application.

## 🔐 What's Protected and What's Not

### ✅ Protected (Not Visible in Client Bundle)

1. **Organizer Emails** - Now stored in Firestore, not in the JavaScript bundle
2. **Environment Variables** - Using `.env` files (not committed to git)

### ⚠️ Public (But Secured via Firebase Rules)

1. **Firebase API Key** - This is **meant to be public** in client-side apps
   - Security comes from Firestore Security Rules, not hiding the key
   - The API key only allows access to your Firebase project
   - Anyone can see it, but they can't do anything without proper authentication
   - You can add domain restrictions in Firebase Console (see below)

## 🛡️ Security Best Practices

### 1. Firebase API Key Security

**Important**: Firebase API keys for web apps are **designed to be public**. They're not secret keys like server-side API keys.

**How Firebase Security Works:**
- The API key identifies your Firebase project
- **Firestore Security Rules** control who can read/write data
- **Firebase Authentication** controls who can sign in
- Even if someone has your API key, they can't access data without proper authentication

**Additional Protection (Optional):**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project → **Settings** (gear icon) → **General**
3. Scroll to **Your apps** section
4. Click on your web app
5. Under **App check**, you can add domain restrictions
6. Add your production domain (e.g., `iise-care.web.app`)

### 2. Organizer Emails Setup

Organizer emails are now stored in Firestore for security. Follow these steps:

#### Initial Setup:

1. **Go to Firebase Console** → Firestore Database
2. **Create a new document:**
   - Collection: `config`
   - Document ID: `organizers`
   - Fields:
     ```
     emails: ["organizer@iisecareerfair.com", "admin@iisecareerfair.com"]
     ```
     (Use array type in Firestore)

3. **Update Firestore Rules** (already done in `firestore.rules`):
   ```javascript
   match /config/organizers {
     // Only organizers can read/write organizer emails
     allow read: if isAuthenticated();
     allow write: if isOrganizer();
   }
   ```

#### Adding/Removing Organizer Emails:

1. Log in as an organizer
2. Go to Firebase Console → Firestore Database
3. Navigate to `config/organizers`
4. Edit the `emails` array field
5. Add or remove email addresses

**Note**: The app caches organizer emails for 5 minutes to reduce Firestore reads.

### 3. Environment Variables

#### For Local Development:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Firebase values in `.env`:
   ```env
   REACT_APP_FIREBASE_API_KEY=your_actual_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=iise-care.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=iise-care
   REACT_APP_FIREBASE_STORAGE_BUCKET=iise-care.firebasestorage.app
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=920584673988
   REACT_APP_FIREBASE_APP_ID=1:920584673988:web:c50e691ccf0c1fd097c791
   ```

3. **Never commit `.env` to git** (already in `.gitignore`)

#### For Production (Firebase Hosting):

**Option A: Environment Variables in Build**
- Create `.env.production` file with production values
- Build includes these values: `npm run build`
- Deploy the build folder

**Option B: Firebase Hosting Environment Variables** (Recommended)
1. Go to Firebase Console → Hosting
2. Click on your site → **Environment variables**
3. Add your environment variables
4. They'll be available at build time

**Note**: React apps bundle environment variables at build time. They're still visible in the bundle, but this is the standard practice for client-side apps.

### 4. Firestore Security Rules

Your Firestore rules are already configured in `firestore.rules`. Make sure they're deployed:

```bash
firebase deploy --only firestore:rules
```

**Key Security Features:**
- Only authenticated users can read most data
- Only organizers can create/update sensitive data
- Users can only read/update their own data
- Recruiters can only update their own company

### 5. What's Visible in the Browser

**What users CAN see:**
- Firebase API key (in JavaScript bundle)
- Firebase project ID
- Your app's structure and routes
- Public data from Firestore (based on security rules)

**What users CANNOT see:**
- Organizer emails (stored in Firestore, protected by rules)
- User passwords (handled by Firebase Auth)
- Private user data (protected by Firestore rules)
- Environment variables (bundled at build time, but not easily readable)

## 🔍 Verifying Security

### Check What's Exposed:

1. **View Page Source**: Right-click → View Page Source
   - You'll see the HTML, but not the bundled JavaScript

2. **Browser DevTools**:
   - Open DevTools (F12)
   - Go to Sources tab
   - Find your JavaScript files
   - Search for sensitive strings

3. **Test Firestore Rules**:
   - Try accessing data as different user roles
   - Verify that unauthorized access is blocked

## 🚨 If You Suspect a Security Issue

1. **Rotate Firebase API Key** (if needed):
   - Firebase Console → Settings → General
   - Under "Your apps", regenerate the API key
   - Update your `.env` file

2. **Review Firestore Rules**:
   - Make sure rules are properly deployed
   - Test with different user roles

3. **Check Firebase Authentication**:
   - Review who has access
   - Remove any suspicious accounts

4. **Update Organizer Emails**:
   - Remove any compromised emails from Firestore
   - Add new organizer emails

## 📝 Summary

- ✅ **Organizer emails**: Protected in Firestore
- ✅ **Firebase API key**: Public but secured via rules (this is normal)
- ✅ **Environment variables**: Use `.env` files (not in git)
- ✅ **Firestore rules**: Deployed and protecting your data
- ✅ **User passwords**: Handled securely by Firebase Auth

**Remember**: The most important security is your **Firestore Security Rules**. Even if someone has your API key, they can't access data without proper authentication and authorization.
