import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { toast } from 'sonner';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

export async function signIn() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Check for college email (optional demo gate, but we'll allow all for now while warning)
    if (!user.email?.endsWith('.edu') && !user.email?.endsWith('@gmail.com')) {
      toast.warning('A .edu email is highly recommended for StudyBuddy.');
    } // Allowing @gmail.com for ease of testing in this environment

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        reputation: 0,
        createdAt: new Date()
      });
      toast.success('Account created! Welcome to StudyBuddy.');
    } else {
      toast.success('Signed in successfully.');
    }
  } catch (err: any) {
    if (err.code !== 'auth/popup-closed-by-user') {
      console.error(err);
      toast.error('Failed to sign in.');
    }
  }
}

export async function logOut() {
  await signOut(auth);
  toast.success('Signed out.');
}
