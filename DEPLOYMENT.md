# Deployment Guide for IISECareerFair

This guide will walk you through deploying your React app to the public internet.

## Prerequisites

- Node.js and npm installed
- Firebase project already set up (you're using `iise-care` project)
- Git repository (optional but recommended)

---

## Option 1: Firebase Hosting (Recommended - Since you're already using Firebase)

Firebase Hosting is the easiest option since you're already using Firebase for your backend.

### Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase

```bash
firebase login
```

This will open a browser window for you to authenticate with your Google account.

### Step 3: Initialize Firebase Hosting

From your project root directory:

```bash
firebase init hosting
```

When prompted:
- **Select existing project**: Choose `iise-care` (your existing Firebase project)
- **What do you want to use as your public directory?**: Type `build`
- **Configure as a single-page app?**: Type `Yes` (important for React Router)
- **Set up automatic builds and deploys with GitHub?**: Type `No` (unless you want CI/CD)
- **File build/index.html already exists. Overwrite?**: Type `No`

### Step 4: Build Your React App

```bash
npm run build
```

This creates an optimized production build in the `build/` folder.

### Step 5: Deploy to Firebase

```bash
firebase deploy --only hosting
```

Your app will be deployed and you'll get a URL like: `https://iise-care.web.app` or `https://iise-care.firebaseapp.com`

### Step 6: Custom Domain (Optional)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project → Hosting
3. Click "Add custom domain"
4. Follow the instructions to verify domain ownership

---

## Option 2: Vercel (Alternative - Very Easy)

Vercel is excellent for React apps and offers free hosting.

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Build Your App

```bash
npm run build
```

### Step 3: Deploy

```bash
vercel
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? **Your account**
- Link to existing project? **No**
- What's your project's name? **iise-career-fair** (or your choice)
- In which directory is your code located? **./** (current directory)

Vercel will automatically detect it's a React app and configure it.

### Step 4: Production Deployment

For production:

```bash
vercel --prod
```

You'll get a URL like: `https://iise-career-fair.vercel.app`

**Note**: You can also deploy via GitHub by connecting your repo at [vercel.com](https://vercel.com) for automatic deployments on every push.

---

## Option 3: Netlify (Alternative)

### Step 1: Install Netlify CLI

```bash
npm install -g netlify-cli
```

### Step 2: Build Your App

```bash
npm run build
```

### Step 3: Deploy

```bash
netlify deploy --prod --dir=build
```

Follow the prompts to login and authorize.

You'll get a URL like: `https://your-app-name.netlify.app`

**Note**: You can also drag and drop your `build` folder at [app.netlify.com/drop](https://app.netlify.com/drop)

---

## Important Configuration Notes

### Security Setup

**Before deploying, make sure to:**

1. **Set up organizer emails in Firestore** (see `SETUP_ORGANIZERS.md`):
   - Create `config/organizers` document in Firestore
   - Add organizer emails to the `emails` array field
   - This prevents organizer emails from being visible in your code

2. **Deploy Firestore security rules**:
   ```bash
   firebase deploy --only firestore:rules
   ```

3. **Review security documentation**: See `SECURITY.md` for complete security best practices

### Environment Variables

The app now uses environment variables for Firebase config. The `.env` file is already set up with your current values.

**For production:**
- The `.env` file is already in `.gitignore` (won't be committed)
- Firebase API keys are meant to be public in client-side apps (security comes from Firestore rules)
- See `SECURITY.md` for details on Firebase API key security

**Vercel/Netlify**: Add environment variables in their dashboard under project settings if needed.

### CORS Configuration

If you're using Firebase Storage or other services, ensure CORS is configured if needed. Your current Firebase config should work fine.

---

## Post-Deployment Checklist

- [ ] Test the deployed app URL
- [ ] Verify authentication works
- [ ] Test all user roles (student, recruiter, organizer)
- [ ] Check that the map/floor plan loads correctly
- [ ] Verify Firestore rules are deployed
- [ ] Test on mobile devices
- [ ] Check browser console for any errors

---

## Updating Your Deployment

### Firebase Hosting
```bash
npm run build
firebase deploy --only hosting
```

### Vercel
```bash
vercel --prod
```

### Netlify
```bash
npm run build
netlify deploy --prod --dir=build
```

---

## Troubleshooting

### Build Errors
- Make sure all dependencies are installed: `npm install`
- Check for TypeScript/ESLint errors: `npm run build` locally first

### Routing Issues (404 on refresh)
- **Firebase**: Make sure you selected "Yes" for single-page app during `firebase init`
- **Vercel**: Automatically handled
- **Netlify**: Create `public/_redirects` file with: `/* /index.html 200`

### Firebase Connection Issues
- Verify your Firebase config in `src/firebase.js` matches your project
- Check that Firestore rules allow public read access where needed
- Ensure Firebase project billing is enabled if using certain features

---

## Recommended: Firebase Hosting

Since you're already using Firebase for authentication and Firestore, **Firebase Hosting is the recommended choice** because:
- Everything is in one place
- Easy to manage
- Free tier is generous
- Automatic SSL certificates
- Fast global CDN

Good luck with your deployment! 🚀
