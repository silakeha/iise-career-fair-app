# How to Create a New Organizer User

**IMPORTANT**: Before creating organizer users, you need to set up the `config` collection in Firestore. See `CREATE_CONFIG_COLLECTION.md` for instructions.

There are two ways to create a new organizer user, depending on whether the person already has an account or not.

## Method 1: Add Email to Organizer List (Recommended)

This is the easiest method. The system will automatically assign the organizer role when they sign up or log in.

### Step 1: Create Config Collection (First Time Only)

If you don't have a `config` collection yet, follow the instructions in `CREATE_CONFIG_COLLECTION.md` first.

### Step 2: Add Email to Firestore

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `iise-care`
3. Click on **Firestore Database** in the left sidebar
4. Navigate to the `config` collection
5. Click on the `organizers` document
6. Find the `emails` field (array type)
7. Click **Add item** in the array
8. Enter the new organizer's email address
9. Click **Update**

### Step 2: Have the Person Sign Up or Log In

**If they don't have an account yet:**
- They can go to your app's login page
- Click "Need an account? Sign Up"
- Sign up with the email you added to the organizer list
- They will automatically get the organizer role

**If they already have an account:**
- They just need to log in with their existing email
- The system will check if their email is in the organizer list
- If it is, they'll automatically get organizer access

### Step 3: Verify

- After logging in, they should be redirected to `/organizer` (Organizer Dashboard)
- They should see options to create companies and recruiters

---

## Method 2: Manually Create User in Firebase Console

If you need to create the account immediately without the person signing up:

### Step 1: Add Email to Organizer List

Follow Step 1 from Method 1 above.

### Step 2: Create User in Firebase Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project → **Authentication** → **Users** tab
3. Click **Add user**
4. Enter the email address
5. Enter a temporary password (you'll share this with them)
6. Click **Add user**

### Step 3: Create User Document in Firestore

1. Go to **Firestore Database**
2. Click **Start collection** (if needed)
3. **Collection ID**: `users`
4. **Document ID**: Copy the User UID from Authentication (click on the user you just created)
5. Add these fields:
   - `email` (string): The user's email
   - `role` (string): `organizer`
   - `createdAt` (timestamp): Current date/time
6. Click **Save**

### Step 4: Share Credentials

- Share the email and temporary password with the new organizer
- They should change their password on first login
- They can use "Forgot Password" if needed

---

## Quick Reference

**Where organizer emails are stored:**
- Firestore: `config/organizers` → `emails` (array)

**Where user roles are stored:**
- Firestore: `users/{userId}` → `role` (string: "organizer", "recruiter", or "student")

**How the system works:**
1. User signs up/logs in with email
2. System checks if email is in `config/organizers/emails`
3. If yes → automatically assigns `role: "organizer"` in their user document
4. User gets access to Organizer Dashboard

---

## Troubleshooting

**Problem**: User signed up but doesn't have organizer access
- **Check**: Is their email in `config/organizers/emails`?
- **Solution**: Add their email to the organizer list, then have them log out and log back in

**Problem**: "Permission denied" when accessing organizer dashboard
- **Check**: Does their user document have `role: "organizer"`?
- **Solution**: Manually set the role in Firestore, or add email to organizer list and have them log in again

**Problem**: Changes not taking effect
- **Note**: Organizer emails are cached for 5 minutes
- **Solution**: Wait 5 minutes, or clear browser cache and reload

---

## Security Notes

- Only emails in the `config/organizers/emails` array can become organizers
- Only existing organizers can modify the organizer emails list (via Firestore rules)
- User passwords are handled securely by Firebase Authentication
- Never share passwords via insecure channels
