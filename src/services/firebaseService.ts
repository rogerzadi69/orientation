import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { 
  initializeFirestore,
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  increment, 
  updateDoc, 
  getDoc,
  setDoc,
  query,
  orderBy,
  limit,
  getDocs,
  getDocFromServer,
  getDocsFromServer,
  getCountFromServer,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Admin email from user metadata
export const ADMIN_EMAIL = 'doizylet@gmail.com';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Use initializeFirestore with settings optimized for sandboxed environments to avoid "Unexpected state" errors
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
} as any, (firebaseConfig as any).firestoreDatabaseId);

export const auth = getAuth(app);

// Test connection as per guidelines
export async function testConnection() {
  try {
    // Attempt to fetch from server specifically to verify connectivity
    await getDocFromServer(doc(db, '_connection_test', 'ping'));
    console.log("Firebase connection: OK");
    return true;
  } catch (error: any) {
    console.warn("Firebase connection test:", error.message);
    return false;
  }
}

export const signInWithGoogle = async () => {
  if (!auth) {
    console.error("Firebase Auth not initialized");
    alert("Le service d'authentification Firebase n'est pas encore prêt ou configuré. Veuillez vérifier la console Firebase.");
    return;
  }
  const provider = new GoogleAuthProvider();
  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Error signing in with Google", error);
    alert("Erreur lors de la connexion Google : " + (error instanceof Error ? error.message : String(error)));
  }
};

export const logout = () => auth && signOut(auth);

export const signInWithEmail = async (email: string, pass: string) => {
  if (!auth) return { error: "Service non disponible" };
  try {
    const trimmedEmail = email.trim();
    const result = await signInWithEmailAndPassword(auth, trimmedEmail, pass);
    return { user: result.user };
  } catch (error: any) {
    console.error("Error signing in with Email", error);
    return { error: error.code || error.message };
  }
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

export async function submitResult(data: any, force = false) {
  if (!db) return { error: "Base de données non disponible" };
  try {
    const matricule = data.matricule?.trim().toUpperCase();
    if (!matricule) return { error: "Matricule manquant" };

    console.log(`Checking uniqueness for matricule: ${matricule}`);
    const docRef = doc(db, 'submissions', matricule);
    
    if (!force) {
      const existing = await getDoc(docRef);
      if (existing.exists()) {
        console.log("Duplicate found for matricule:", matricule);
        return { exists: true, existingData: existing.data() };
      }
    }
    
    console.log("Writing submission with ID:", matricule);
    await setDoc(docRef, {
      ...data,
      timestamp: serverTimestamp()
    });

    return { success: true, id: matricule };
  } catch (error: any) {
    handleFirestoreError(error, OperationType.WRITE, `submissions/${data.matricule}`);
    return { error: error.message || String(error) };
  }
}

export async function getDashboardStats() {
  if (!db) return { error: "Base de données non disponible" };
  try {
    const submissionsRef = collection(db, 'submissions');
    const usersRef = collection(db, 'users');
    
    console.log("Fetching stats from submissions and users...");
    let totalCount = 0;
    
    // Helper to get count from a collection
    const getSafeCount = async (colRef: any) => {
      try {
        const snap = await getCountFromServer(colRef);
        return snap.data().count;
      } catch (e) {
        try {
          const s = await getDocsFromServer(colRef);
          return s.size;
        } catch (e2) {
          return 0;
        }
      }
    };

    const subCount = await getSafeCount(submissionsRef);
    const userCount = await getSafeCount(usersRef);
    
    // Check for another common collection name in French
    const usersFrRef = collection(db, 'utilisateurs');
    const userFrCount = await getSafeCount(usersFrRef);
    
    // The total is usually either the number of unique users or the number of submissions
    // We'll show the highest one or sum if they seem to be distinct entities
    totalCount = Math.max(subCount, userCount, userFrCount, userCount + userFrCount);
    
    console.log(`Counts - submissions: ${subCount}, users: ${userCount}, utilisateurs: ${userFrCount}, total used: ${totalCount}`);
    
    // Recent submissions (limit to 100 for performance)
    const submissionsQuery = query(submissionsRef, orderBy('timestamp', 'desc'), limit(100));
    const submissionsSnap = await getDocs(submissionsQuery);
    
    const submissions = submissionsSnap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    console.log(`Fetched ${submissions.length} recent entries. Total count determined as: ${totalCount}`);

    // If totalCount is still 0 but we have fetched some entries, use that number
    const finalTotal = totalCount || submissions.length;

    return {
      total: finalTotal,
      recent: submissions
    };
  } catch (error: any) {
    handleFirestoreError(error, OperationType.GET, 'dashboard');
    return { error: `Erreur de lecture: ${error?.message || String(error)}` };
  }
}

export async function deleteSubmission(id: string) {
  if (!db) return { success: false, error: "Database not initialized" };
  try {
    await deleteDoc(doc(db, 'submissions', id));
    return { success: true };
  } catch (error: any) {
    handleFirestoreError(error, OperationType.DELETE, `submissions/${id}`);
    return { success: false, error: error.message || String(error) };
  }
}

export async function clearAllSubmissions() {
  if (!db) return { success: false, error: "Database not initialized" };
  try {
    console.log("Starting full database clear (submissions and users)...");
    
    const collectionsToClear = ['submissions', 'users', 'utilisateurs', 'candidats', 'élèves', 'students'];
    
    for (const colName of collectionsToClear) {
      try {
        const colRef = collection(db, colName);
        const snap = await getDocs(colRef);
        
        if (!snap.empty) {
          console.log(`Deleting ${snap.size} documents from ${colName}...`);
          const docs = snap.docs;
          
          if (docs.length <= 10) {
            const deletePromises = docs.map(d => deleteDoc(d.ref));
            await Promise.all(deletePromises);
          } else {
            const batchSize = 400;
            for (let i = 0; i < docs.length; i += batchSize) {
              const batch = writeBatch(db);
              const chunk = docs.slice(i, i + batchSize);
              chunk.forEach(d => batch.delete(d.ref));
              await batch.commit();
            }
          }
        }
      } catch (colError) {
        console.warn(`Could not clear collection ${colName}:`, colError);
      }
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Critical error in clearAllSubmissions:", error);
    handleFirestoreError(error, OperationType.DELETE, 'submissions/all');
    return { success: false, error: error.message || String(error) };
  }
}
