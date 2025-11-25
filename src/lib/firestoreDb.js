import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';

/**
 * Convert Firestore Timestamp to JavaScript Date
 */
function convertTimestamps(data) {
  if (!data) return data;
  
  const converted = { ...data };
  
  // Convert Firestore Timestamps to Dates
  Object.keys(converted).forEach((key) => {
    const value = converted[key];
    if (value && typeof value === 'object') {
      // Check if it's a Firestore Timestamp
      if (value.constructor && value.constructor.name === 'Timestamp') {
        converted[key] = value.toDate();
      } else if (value.toDate && typeof value.toDate === 'function') {
        // Handle Timestamp objects
        converted[key] = value.toDate();
      } else if (Array.isArray(value)) {
        converted[key] = value.map(convertTimestamps);
      } else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
        // Recursively convert nested objects
        converted[key] = convertTimestamps(value);
      }
    }
  });
  
  return converted;
}

/**
 * Firestore database operations for race entries
 */
export const firestoreDb = {
  /**
   * Get all race entries for the current user
   */
  async getEntries(userId) {
    try {
      const entriesRef = collection(db, 'raceEntries');
      
      // Try to query with orderBy, but fallback to just where if index is missing
      let querySnapshot;
      let useInMemorySort = false;
      try {
        const q = query(
          entriesRef,
          where('userId', '==', userId),
          orderBy('date', 'desc')
        );
        querySnapshot = await getDocs(q);
      } catch (indexError) {
        // Check if it's an index-related error
        const isIndexError = 
          indexError.code === 'failed-precondition' || 
          indexError.code === 9 || // FAILED_PRECONDITION
          indexError.message?.includes('index') ||
          indexError.message?.includes('requires an index');
        
        if (isIndexError) {
          // Only warn once per session to avoid spam
          if (!sessionStorage.getItem('index-warning-shown')) {
            console.warn('Firestore index missing or still building. Sorting in memory. The index may still be building - check Firebase Console.');
            sessionStorage.setItem('index-warning-shown', 'true');
          }
          useInMemorySort = true;
          const q = query(
            entriesRef,
            where('userId', '==', userId)
          );
          querySnapshot = await getDocs(q);
        } else {
          throw indexError;
        }
      }
      
      let entries = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return convertTimestamps({
          id: doc.id,
          ...data,
        });
      });
      
      // Sort by date in memory if we couldn't use orderBy
      if (useInMemorySort) {
        entries.sort((a, b) => {
          const dateA = a.date instanceof Date ? a.date : new Date(a.date || 0);
          const dateB = b.date instanceof Date ? b.date : new Date(b.date || 0);
          return dateB - dateA; // Descending order
        });
      }
      
      return entries;
    } catch (error) {
      console.error('Failed to get entries:', error);
      throw error;
    }
  },

  /**
   * Get a single race entry by ID
   */
  async getEntry(entryId) {
    try {
      const entryRef = doc(db, 'raceEntries', entryId);
      const entrySnap = await getDoc(entryRef);
      
      if (entrySnap.exists()) {
        const data = entrySnap.data();
        return convertTimestamps({
          id: entrySnap.id,
          ...data,
        });
      } else {
        throw new Error('Entry not found');
      }
    } catch (error) {
      console.error('Failed to get entry:', error);
      throw error;
    }
  },

  /**
   * Add a new race entry
   */
  async addEntry(userId, entryData) {
    try {
      const entriesRef = collection(db, 'raceEntries');
      
      // Convert date string to Date object if it's a string
      let processedData = { ...entryData };
      if (processedData.date && typeof processedData.date === 'string') {
        // If it's in YYYY-MM-DD format, convert to Date
        if (/^\d{4}-\d{2}-\d{2}$/.test(processedData.date)) {
          const [year, month, day] = processedData.date.split('-').map(Number);
          processedData.date = new Date(year, month - 1, day);
        } else {
          processedData.date = new Date(processedData.date);
        }
      }
      
      const entryWithMetadata = {
        ...processedData,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(entriesRef, entryWithMetadata);
      return docRef.id;
    } catch (error) {
      console.error('Failed to add entry:', error);
      throw error;
    }
  },

  /**
   * Update an existing race entry
   */
  async updateEntry(entryId, entryData) {
    try {
      const entryRef = doc(db, 'raceEntries', entryId);
      
      // Convert date string to Date object if it's a string
      let processedData = { ...entryData };
      if (processedData.date && typeof processedData.date === 'string') {
        // If it's in YYYY-MM-DD format, convert to Date
        if (/^\d{4}-\d{2}-\d{2}$/.test(processedData.date)) {
          const [year, month, day] = processedData.date.split('-').map(Number);
          processedData.date = new Date(year, month - 1, day);
        } else {
          processedData.date = new Date(processedData.date);
        }
      }
      
      await updateDoc(entryRef, {
        ...processedData,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to update entry:', error);
      throw error;
    }
  },

  /**
   * Delete a race entry
   */
  async deleteEntry(entryId) {
    try {
      const entryRef = doc(db, 'raceEntries', entryId);
      await deleteDoc(entryRef);
    } catch (error) {
      console.error('Failed to delete entry:', error);
      throw error;
    }
  },

  /**
   * Upload an image file to Firebase Storage
   */
  async uploadImage(userId, file, path) {
    try {
      const storageRef = ref(storage, `users/${userId}/${path}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Failed to upload image:', error);
      throw error;
    }
  },
};

