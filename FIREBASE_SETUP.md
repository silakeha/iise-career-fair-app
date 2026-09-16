# Firebase Firestore Security Rules Setup

## How to Update Firebase Permissions

1. **Go to Firebase Console**
   - Navigate to https://console.firebase.google.com/
   - Select your project: `iise-care`

2. **Open Firestore Database**
   - Click on "Firestore Database" in the left sidebar
   - Click on the "Rules" tab at the top

3. **Copy the Rules**
   - Open the `firestore.rules` file in this project
   - Copy all the contents

4. **Paste and Publish**
   - Paste the rules into the Firebase Console Rules editor
   - Click "Publish" to save the rules

## What These Rules Do

### Users Collection
- **Read**: Users can read their own document, organizers can read all users
- **Create**: Only organizers can create users (for recruiter accounts)
- **Update**: Users can update their own document, organizers can update any user

### Vendors Collection
- **Read**: All authenticated users can read vendors
- **Create**: Only organizers can create vendors
- **Update**: Organizers can update any vendor, recruiters can only update their own company

### Resumes Collection
- **Read**: Students can read their own resumes, recruiters can read resumes for their company, organizers can read all
- **Create**: Students can create their own resumes, organizers can create any resume

### Resume Book Collection
- **Read**: Recruiters and organizers can read all entries, students can read their own
- **Create/Update**: Students can create and update their own entry

## Important Notes

- These rules require that user documents have a `role` field ('organizer', 'recruiter', or 'student')
- Recruiters must have a `companyName` field in their user document that matches a vendor name
- Make sure all existing users have the proper `role` field set

## Testing

After updating the rules, test by:
1. Logging in as an organizer - should be able to see all users and recruiters
2. Creating a recruiter account - should work without errors
3. Viewing the organizer dashboard - recruiters list should display
