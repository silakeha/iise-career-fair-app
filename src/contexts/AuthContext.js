import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, functions, app } from '../firebase';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { doc, setDoc, getDoc, collection, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { isOrganizerEmail } from '../config/organizers';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signup(email, password, role, additionalData = {}) {
    // Check if email is an organizer email (now synchronous, reads from env var)
    if (isOrganizerEmail(email)) {
      role = 'organizer';
    }
    
    // Prevent recruiter signup (only organizers can create recruiters)
    if (role === 'recruiter') {
      throw new Error('Recruiter accounts can only be created by organizers. Please contact an organizer.');
    }
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: email,
      role: role,
      createdAt: new Date(),
      ...additionalData
    });
    
    return userCredential;
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      // Handle async operations inside the callback
      try {
        if (user) {
          // Wait a bit longer to ensure auth token is fully propagated to Firestore
          // Firebase sometimes needs a moment to sync the auth token with Firestore rules
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // First, try to get user role from Firestore (faster and more reliable)
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const role = userDoc.data().role;
              setUserRole(role);
              setLoading(false);
              return; // Exit early if we have the role
            }
          } catch (docError) {
            // If permission denied, it might be a timing issue or rules not deployed
            // Continue to check organizer status and create user document if needed
            if (docError.code === 'permission-denied') {
              console.warn('Permission denied reading user document. This might be a timing issue or rules need deployment.');
            } else {
              console.warn('Error fetching user document:', docError);
            }
          }
          
          // If no user document exists (or couldn't read it), check if email is in organizer list
          // Now uses environment variable (synchronous, no Firestore needed)
          if (user && user.uid) {
            const isOrganizer = isOrganizerEmail(user.email);
            if (isOrganizer) {
              // First time organizer login - create organizer account
              try {
                await setDoc(doc(db, 'users', user.uid), {
                  email: user.email,
                  role: 'organizer',
                  createdAt: new Date()
                });
                setUserRole('organizer');
              } catch (createError) {
                console.error('Error creating organizer user document:', createError);
                // Set role anyway so app can continue
                setUserRole('organizer');
              }
            } else {
              // Not an organizer: assume student (only students self-sign-up; recruiters are created by organizers)
              // Create or update user doc so future logins read the role correctly
              try {
                await setDoc(doc(db, 'users', user.uid), {
                  email: user.email,
                  role: 'student',
                  createdAt: new Date()
                }, { merge: true });
              } catch (createErr) {
                console.warn('Could not ensure student user document:', createErr);
              }
              setUserRole('student');
            }
          }
        } else {
          setUserRole(null);
        }
      } catch (error) {
        // Catch any unexpected errors to prevent app from crashing
        console.error('Unexpected error in auth state change:', error);
        setUserRole(null);
      } finally {
        // Always set loading to false, even if there are errors
        setLoading(false);
      }
    });
    
    return unsubscribe;
  }, []);

  // Function to generate a random secure password
  function generateRandomPassword() {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  // Function to create recruiter account (only for organizers)
  async function createRecruiterAccount(email, name, companyName) {
    // Verify current user is an organizer
    if (!currentUser) {
      throw new Error('You must be logged in to create recruiter accounts');
    }
    
    const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (!currentUserDoc.exists() || currentUserDoc.data().role !== 'organizer') {
      throw new Error('Only organizers can create recruiter accounts');
    }
    
    // Try to use Cloud Function first (if available) - this keeps organizer logged in
    try {
      // Ensure user is authenticated before calling the function
      if (!currentUser) {
        throw new Error('You must be logged in to create recruiter accounts');
      }
      
      // Ensure we have a valid auth token before calling the function
      // httpsCallable automatically includes the auth token from auth.currentUser
      // Make sure auth.currentUser is set (it should be since currentUser is set)
      if (!auth.currentUser) {
        throw new Error('Authentication error: No current user found in auth instance');
      }
      
      // Force refresh the token to ensure it's valid and fresh
      const idToken = await auth.currentUser.getIdToken(true);
      console.log('Calling Cloud Function to create recruiter account...', {
        organizerEmail: currentUser.email,
        organizerUid: currentUser.uid,
        hasToken: !!idToken,
        tokenLength: idToken?.length,
        authCurrentUser: !!auth.currentUser,
        authCurrentUserUid: auth.currentUser?.uid,
        authCurrentUserEmail: auth.currentUser?.email,
        currentUserMatches: currentUser.uid === auth.currentUser?.uid
      });
      
      // Use the functions instance from firebase.js - it should be connected to the same app
      // httpsCallable automatically includes the auth token from auth.currentUser
      // The functions instance must use the same Firebase app as auth
      const createRecruiterAccountFunction = httpsCallable(
        functions,
        'createRecruiterAccount'
      );
      
      console.log('About to call function, auth state:', {
        hasAuth: !!auth.currentUser,
        authUid: auth.currentUser?.uid,
        authEmail: auth.currentUser?.email,
        tokenReady: !!idToken
      });
      
      // Call the function - auth token should be automatically included
      // The token refresh above ensures auth.currentUser has a fresh token
      const result = await createRecruiterAccountFunction({
        email: email,
        name: name,
        companyName: companyName
      });
      
      console.log('Cloud Function succeeded:', result.data);
      
      // Send password reset email (don't await - let it happen in background)
      // This prevents blocking the UI while the email is sent
      sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false
      }).catch((emailError) => {
        // Log error but don't fail the whole operation
        console.error('Failed to send password reset email:', emailError);
      });
      
      return {
        email,
        companyName,
        organizerEmail: currentUser.email,
        organizerUid: currentUser.uid,
        message: 'Recruiter account created successfully. You remain logged in.'
      };
    } catch (cloudFunctionError) {
      console.error('Cloud Function error details:', {
        code: cloudFunctionError.code,
        message: cloudFunctionError.message,
        details: cloudFunctionError.details
      });
      
      // Check if it's a "function not found" error (not deployed)
      const isFunctionNotFound = 
        cloudFunctionError.code === 'functions/not-found' || 
        cloudFunctionError.code === 'functions/unavailable' ||
        cloudFunctionError.code === 'not-found' ||
        cloudFunctionError.code === 'unavailable' ||
        cloudFunctionError.message?.includes('not found') ||
        cloudFunctionError.message?.includes('not available') ||
        cloudFunctionError.message?.includes('does not exist') ||
        (cloudFunctionError.details && cloudFunctionError.details.includes('not found'));
      
      if (isFunctionNotFound) {
        // Cloud Function not deployed, use fallback method
        console.warn('Cloud Function not available, using fallback method (organizer will be logged out)');
      } else {
        // Other error from Cloud Function - log it and rethrow
        console.error('Cloud Function error (not a "not found" error):', cloudFunctionError);
        throw cloudFunctionError;
      }
      
      // Store organizer info before creating recruiter
      const organizerEmail = currentUser.email;
      const organizerUid = currentUser.uid;
      
      // Generate a random temporary password
      const tempPassword = generateRandomPassword();
      
      // Create the account with temporary password (this will sign in as the new user)
      const userCredential = await createUserWithEmailAndPassword(auth, email, tempPassword);
      const user = userCredential.user;
      
      // Create user document in Firestore with recruiter role
      await setDoc(doc(db, 'users', user.uid), {
        email: email,
        name: name,
        role: 'recruiter',
        companyName: companyName,
        createdAt: new Date()
      });
      
      // Send password reset email so recruiter can set their own password
      // Note: This must be done while signed in as the new user
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false
      });
      
      // Sign out the newly created recruiter account
      await signOut(auth);
      
      // IMPORTANT: Due to Firebase's behavior, createUserWithEmailAndPassword automatically
      // signs in as the new user, replacing the organizer's session. After signing out,
      // we cannot automatically restore the organizer's session without their password.
      // 
      // The proper solution is to use Firebase Admin SDK through Cloud Functions to create
      // users without signing in. See CLOUD_FUNCTION_SETUP.md for instructions.
      
      // Return info
      return { 
        email, 
        companyName,
        organizerEmail,
        organizerUid,
        message: 'Recruiter account created successfully. You have been signed out - please sign back in to continue.'
      };
    }
  }

  // Function to create company/vendor document (only for organizers)
  async function createCompany(companyData) {
    // Verify current user is an organizer
    if (!currentUser) {
      throw new Error('You must be logged in to create company documents');
    }
    
    const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (!currentUserDoc.exists() || currentUserDoc.data().role !== 'organizer') {
      throw new Error('Only organizers can create company documents');
    }
    
    const docRef = await addDoc(collection(db, 'vendors'), {
      ...companyData,
      createdAt: new Date()
    });
    
    return docRef;
  }

  // Function to update company/vendor document (for organizers - can update anything, or recruiters - limited fields)
  async function updateCompany(companyId, companyData) {
    // Verify current user is logged in
    if (!currentUser) {
      throw new Error('You must be logged in to update company documents');
    }
    
    // Get current user document
    const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (!currentUserDoc.exists()) {
      throw new Error('User document not found');
    }
    
    const userData = currentUserDoc.data();
    
    // Get the company document
    const companyDoc = await getDoc(doc(db, 'vendors', companyId));
    if (!companyDoc.exists()) {
      throw new Error('Company not found');
    }
    
    const companyDataFromDb = companyDoc.data();
    const updateData = {};
    
    // If user is an organizer, they can update everything
    if (userData.role === 'organizer') {
      // Organizers can update all fields including booth, x, y
      if (companyData.name !== undefined) updateData.name = companyData.name;
      if (companyData.description !== undefined) updateData.description = companyData.description;
      if (companyData.logo !== undefined) updateData.logo = companyData.logo;
      if (companyData.booth !== undefined) updateData.booth = companyData.booth;
      if (companyData.x !== undefined) updateData.x = companyData.x;
      if (companyData.y !== undefined) updateData.y = companyData.y;
      if (companyData.MajorsHired !== undefined) updateData.MajorsHired = companyData.MajorsHired;
      if (companyData.YearsHired !== undefined) updateData.YearsHired = companyData.YearsHired;
      if (companyData.SponsorVisa !== undefined) updateData.SponsorVisa = companyData.SponsorVisa;
    } 
    // If user is a recruiter, they can only update specific fields (not booth, x, y, name)
    else if (userData.role === 'recruiter') {
      // Verify the recruiter's companyName matches the company name
      if (userData.companyName?.toLowerCase() !== companyDataFromDb.name?.toLowerCase()) {
        throw new Error('You can only edit your own company\'s information');
      }
      
      // Recruiters cannot update booth, x, y, or name
      if (companyData.description !== undefined) updateData.description = companyData.description;
      if (companyData.logo !== undefined) updateData.logo = companyData.logo;
      if (companyData.MajorsHired !== undefined) updateData.MajorsHired = companyData.MajorsHired;
      if (companyData.YearsHired !== undefined) updateData.YearsHired = companyData.YearsHired;
      if (companyData.SponsorVisa !== undefined) updateData.SponsorVisa = companyData.SponsorVisa;
    } else {
      throw new Error('Only organizers and recruiters can update company documents');
    }
    
    await updateDoc(doc(db, 'vendors', companyId), {
      ...updateData,
      updatedAt: new Date()
    });
    
    return { success: true };
  }

  // Function to delete company/vendor document (only for organizers)
  async function deleteCompany(companyId) {
    // Verify current user is logged in
    if (!currentUser) {
      throw new Error('You must be logged in to delete company documents');
    }
    
    // Get current user document
    const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (!currentUserDoc.exists()) {
      throw new Error('User document not found');
    }
    
    const userData = currentUserDoc.data();
    
    // Only organizers can delete companies
    if (userData.role !== 'organizer') {
      throw new Error('Only organizers can delete company documents');
    }
    
    // Verify the company exists
    const companyDoc = await getDoc(doc(db, 'vendors', companyId));
    if (!companyDoc.exists()) {
      throw new Error('Company not found');
    }
    
    // Delete the company document
    await deleteDoc(doc(db, 'vendors', companyId));
    
    return { success: true };
  }

  const value = {
    currentUser,
    userRole,
    signup,
    login,
    logout,
    createRecruiterAccount,
    createCompany,
    updateCompany,
    deleteCompany
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}