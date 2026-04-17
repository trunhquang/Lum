import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';

export const authService = {
  // Sign in with Google
  loginWithGoogle: async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Sync user profile to Firestore
      await authService.syncUserProfile(user);
      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Log out
  logout: async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  // Sync profile
  syncUserProfile: async (user: User) => {
    const userRef = doc(db, 'users', user.uid);
    try {
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        });
      } else {
        await updateDoc(userRef, {
          lastLogin: new Date().toISOString()
        });
      }
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  },

  // Listen for auth changes
  onAuthChange: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  }
};
