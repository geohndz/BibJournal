import { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for redirect result (after Google sign-in redirect)
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          // User signed in via redirect
          console.log('Signed in via redirect');
        }
      })
      .catch((error) => {
        // Handle redirect errors silently (user might not have come from redirect)
        if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
          console.error('Redirect sign-in error:', error);
        }
      });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signup = async (email, password) => {
    return await createUserWithEmailAndPassword(auth, email, password);
  };

  const login = async (email, password) => {
    return await signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    
    // Try popup first (better UX), fallback to redirect if it fails
    try {
      return await signInWithPopup(auth, provider);
    } catch (error) {
      // If popup fails (blocked, closed, or COEP/COOP issues), use redirect
      if (
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/popup-blocked' ||
        error.code === 'auth/cancelled-popup-request' ||
        error.message?.includes('popup')
      ) {
        console.log('Popup authentication failed, using redirect instead');
        // signInWithRedirect is synchronous and redirects immediately
        // The page will reload after authentication completes
        signInWithRedirect(auth, provider);
        // This line won't execute because redirect happens immediately
        return;
      }
      // Re-throw other errors
      throw error;
    }
  };

  const logout = async () => {
    return await signOut(auth);
  };

  const value = {
    currentUser,
    signup,
    login,
    loginWithGoogle,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

