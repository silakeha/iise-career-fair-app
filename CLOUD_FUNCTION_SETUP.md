# Cloud Function Setup for User Creation

## Problem
When organizers create recruiter accounts using `createUserWithEmailAndPassword`, Firebase automatically signs in as the newly created user, which logs out the organizer.

## Solution
Use Firebase Admin SDK through Cloud Functions to create users without signing in. This allows the organizer to stay logged in.

## Setup Instructions

### 1. Initialize Functions (if not already done)
```bash
firebase init functions
```

### 2. Install Dependencies
```bash
cd functions
npm install firebase-admin
```

### 3. Create the Function
Create `functions/index.js`:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.createRecruiterAccount = functions.https.onCall(async (data, context) => {
  // Verify the caller is an organizer
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
  if (!userDoc.exists || userDoc.data().role !== 'organizer') {
    throw new functions.https.HttpsError('permission-denied', 'Only organizers can create recruiter accounts');
  }

  const { email, name, companyName } = data;
  
  if (!email || !name || !companyName) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  try {
    // Create user using Admin SDK (doesn't sign in)
    const userRecord = await admin.auth().createUser({
      email: email,
      emailVerified: false,
      // Generate a random password - user will reset it via email
      password: Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12) + 'A1!',
    });

    // Create user document in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email: email,
      name: name,
      role: 'recruiter',
      companyName: companyName,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Send password reset email
    const resetLink = await admin.auth().generatePasswordResetLink(email);
    // You can send this link via email or return it
    
    return {
      success: true,
      uid: userRecord.uid,
      email: email,
      message: 'Recruiter account created successfully'
    };
  } catch (error) {
    console.error('Error creating recruiter:', error);
    throw new functions.https.HttpsError('internal', 'Error creating recruiter account', error);
  }
});
```

### 4. Deploy the Function
```bash
firebase deploy --only functions
```

### 5. Update Frontend Code
Update `src/contexts/AuthContext.js` to call the Cloud Function instead of `createUserWithEmailAndPassword`:

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

// In createRecruiterAccount function:
const functions = getFunctions();
const createRecruiterAccountFunction = httpsCallable(functions, 'createRecruiterAccount');

const result = await createRecruiterAccountFunction({
  email: email,
  name: name,
  companyName: companyName
});

// Send password reset email from frontend if needed
await sendPasswordResetEmail(auth, email, {
  url: `${window.location.origin}/login`,
  handleCodeInApp: false
});
```

## Benefits
- Organizer stays logged in
- More secure (Admin SDK has elevated permissions)
- No automatic sign-in when creating users
- Better user experience

## Note
This requires Firebase Blaze plan (pay-as-you-go) for Cloud Functions, but the free tier includes generous usage limits.
