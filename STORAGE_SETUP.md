# Firebase Storage Rules Setup

## Problem
If you're getting a "User does not have permission" error when uploading logos, you need to deploy the Storage security rules.

## Solution

### Step 1: Deploy Storage Rules

Run this command to deploy the storage rules:

```bash
firebase deploy --only storage
```

### Step 2: Verify Rules Are Deployed

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `iise-care`
3. Click on **Storage** in the left sidebar
4. Click on the **Rules** tab
5. You should see the storage rules

### Alternative: Manual Setup

If the command doesn't work, you can manually set the rules:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project → **Storage** → **Rules** tab
3. Copy the contents of `storage.rules` file
4. Paste into the rules editor
5. Click **Publish**

## What the Rules Do

### Company Logos (`/company-logos/`)
- **Read**: Any authenticated user can read (to display logos)
- **Write**: Any authenticated user can upload/delete
  - Note: App-level logic ensures only organizers and recruiters can access the upload UI

### Resumes (`/resumes/{userId}/`)
- **Read/Write**: Users can only access their own resumes (by userId)
- **Read**: Other authenticated users can read (filtered by company in app logic)

### Floor Plans (`/floor-plans/`)
- **Read**: Any authenticated user can read
- **Write**: Any authenticated user can upload (app ensures only organizers can access)

## Security Note

The Storage rules are intentionally permissive for authenticated users. The actual access control is handled at the application level:
- Only organizers can create companies (checked in `OrganizerDashboard`)
- Only recruiters can edit their own company (checked in `RecruiterDashboard`)
- Only students can upload their own resumes (checked in `StudentDashboard`)

This is a common pattern that balances security with simplicity.
