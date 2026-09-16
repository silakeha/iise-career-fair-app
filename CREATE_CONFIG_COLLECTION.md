# Creating the Config Collection in Firestore

Since the `config` collection doesn't exist yet, follow these steps to create it.

## Step-by-Step Instructions

### Step 1: Go to Firebase Console

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `iise-care`

### Step 2: Open Firestore Database

1. Click on **Firestore Database** in the left sidebar
2. If you see "Start collection" or "Create database", you're in the right place

### Step 3: Create the Config Collection

1. Click **Start collection** (or **Add collection** if you already have other collections)
2. **Collection ID**: Type `config` (lowercase, exactly as shown)
3. Click **Next**

### Step 4: Create the Organizers Document

1. **Document ID**: Type `organizers` (lowercase, exactly as shown)
2. Click **Add field** to add the first field:
   - **Field name**: `emails`
   - **Field type**: Select **array** from the dropdown
   - **Value**: Click **Add item** and enter your first organizer email (e.g., `organizer@iisecareerfair.com`)
   - Click **Add item** again to add more emails if needed
3. Click **Save**

### Step 5: Verify

Your Firestore structure should now look like this:
```
config (collection)
  └── organizers (document)
      └── emails (array)
          ├── organizer@iisecareerfair.com
          ├── admin@iisecareerfair.com
          └── (add more as needed)
```

## Adding More Organizer Emails Later

1. Go to Firestore Database
2. Click on `config` collection
3. Click on `organizers` document
4. Find the `emails` field
5. Click **Add item** in the array
6. Enter the new email
7. Click **Update**

## Important Notes

- **Collection name**: Must be exactly `config` (lowercase)
- **Document name**: Must be exactly `organizers` (lowercase)
- **Field name**: Must be exactly `emails` (lowercase, plural)
- **Field type**: Must be **array** (not string or map)

## Troubleshooting

**Problem**: Can't find "Start collection" button
- **Solution**: Make sure you're in the Firestore Database section, not Realtime Database

**Problem**: Can't select "array" as field type
- **Solution**: Make sure you're creating a new document, not editing an existing one. Arrays can be tricky - try clicking "Add item" first, then the type should appear

**Problem**: Changes not working after creating
- **Solution**: 
  - Wait 5 minutes (cache duration)
  - Clear browser cache
  - Have users log out and log back in

## Alternative: Using Firebase CLI

If you prefer using the command line:

```bash
# This would require creating a script, but it's easier to use the Console
```

For now, the Firebase Console method above is the easiest.
