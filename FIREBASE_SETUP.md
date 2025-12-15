# Firebase Setup Guide

This guide will walk you through setting up Firebase Authentication and Firestore Database for your BibBox application.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard:
   - Enter a project name
   - (Optional) Enable Google Analytics
   - Click "Create project"

## Step 2: Enable Authentication

1. In the Firebase Console, go to **Authentication** in the left sidebar
2. Click **Get Started**
3. Go to the **Sign-in method** tab
4. Enable the following sign-in providers:
   - **Email/Password**: Click on it, toggle "Enable", and click "Save"
   - **Google**: Click on it, toggle "Enable", set your project support email, and click "Save"

## Step 3: Create Firestore Database

1. In the Firebase Console, go to **Firestore Database** in the left sidebar
2. Click **Create database**
3. Choose **Start in test mode** (for development) or **Start in production mode** (for production)
   - **Test mode**: Allows read/write access for 30 days
   - **Production mode**: Requires security rules (recommended for production)
4. Select a location for your database (choose the closest to your users)
5. Click **Enable**

### Security Rules (Recommended for Production)

After creating the database, go to the **Rules** tab and update with these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User Profiles Collection
    match /userProfiles/{userId} {
      // Allow read access to all users (for public profiles)
      allow read: if true;
      
      // Allow create/update only for the authenticated user's own profile
      allow create, update: if request.auth != null && request.auth.uid == userId;
      
      // Allow delete only for the authenticated user's own profile
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // Race Entries Collection
    match /raceEntries/{entryId} {
      // Allow read access to all users (for public profile viewing)
      allow read: if true;
      
      // Allow create only for authenticated users
      allow create: if request.auth != null && 
                     request.resource.data.userId == request.auth.uid;
      
      // Allow update only for the entry owner
      allow update: if request.auth != null && 
                     resource.data.userId == request.auth.uid;
      
      // Allow delete only for the entry owner
      allow delete: if request.auth != null && 
                     resource.data.userId == request.auth.uid;
    }
  }
}
```

## Step 4: Enable Storage (for image uploads)

1. In the Firebase Console, go to **Storage** in the left sidebar
2. Click **Get Started**
3. Start in **test mode** (for development) or set up security rules
4. Choose the same location as your Firestore database
5. Click **Done**

### Storage Security Rules (Recommended)

Go to the **Rules** tab in Storage and update:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Step 5: Get Your Firebase Configuration

1. In the Firebase Console, click the gear icon ⚙️ next to "Project Overview"
2. Select **Project settings**
3. Scroll down to "Your apps" section
4. If you don't have a web app, click the **</>** icon to add one
5. Register your app with a nickname (e.g., "BibBox Web")
6. Copy the `firebaseConfig` object

## Step 6: Update Your Application

1. Open `src/lib/firebase.js` in your project
2. Replace the placeholder values with your actual Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Step 7: Test Your Setup

1. Start your development server: `npm run dev`
2. You should see a login screen
3. Try creating an account with email/password
4. Try signing in with Google
5. Create a race entry to test Firestore

## Troubleshooting

### Authentication Issues
- Make sure Email/Password and Google sign-in are enabled in Firebase Console
- Check that your API key is correct in `firebase.js`

### Firestore Issues
- Verify your security rules allow authenticated users to read/write
- Check the browser console for error messages
- Ensure Firestore is enabled in your Firebase project

### Storage Issues
- Make sure Storage is enabled in Firebase Console
- Check Storage security rules allow authenticated users to upload

## Migration from IndexedDB

Your existing data in IndexedDB (Dexie) will remain local. To migrate data to Firestore:

1. Export your data from IndexedDB
2. Import it into Firestore manually, or
3. Create a migration script that reads from IndexedDB and writes to Firestore

## Next Steps

- Set up proper security rules for production
- Consider adding user profiles
- Set up Firebase Hosting for deployment
- Configure custom domain (optional)

