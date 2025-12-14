import { useState, useEffect } from 'react';
import { firestoreDb } from '../lib/firestoreDb';
import { useAuth } from '../contexts/AuthContext';
// Images are now processed in the form component, so we just upload them here
import { parseGPX } from '../lib/gpxParser';

/**
 * Custom hook for managing race entries
 */
export function useRaceEntries() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  // Load entries from Firestore
  useEffect(() => {
    if (currentUser) {
      loadEntries();
    } else {
      setEntries([]);
      setLoading(false);
    }
  }, [currentUser]);

  const loadEntries = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const allEntries = await firestoreDb.getEntries(currentUser.uid);
      setEntries(allEntries);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load entries:', error);
      setLoading(false);
    }
  };

  const addEntry = async (entryData) => {
    if (!currentUser) {
      throw new Error('User must be logged in to add entries');
    }
    
    try {
      const processedEntry = await processEntryImages(entryData, null, currentUser.uid);
      const id = await firestoreDb.addEntry(currentUser.uid, processedEntry);
      
      // Refresh entries and wait for it to complete
      await loadEntries();
      
      // Small additional delay to ensure state has propagated
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return id;
    } catch (error) {
      console.error('Failed to add entry:', error);
      throw error;
    }
  };

  const updateEntry = async (id, entryData) => {
    if (!currentUser) {
      throw new Error('User must be logged in to update entries');
    }
    
    try {
      const processedEntry = await processEntryImages(entryData, id, currentUser.uid);
      await firestoreDb.updateEntry(id, processedEntry);
      
      await loadEntries();
    } catch (error) {
      console.error('Failed to update entry:', error);
      throw error;
    }
  };

  const deleteEntry = async (id) => {
    if (!currentUser) {
      throw new Error('User must be logged in to delete entries');
    }
    
    try {
      // Optimistically remove from UI
      setEntries(prev => prev.filter(entry => entry.id !== id));
      
      await firestoreDb.deleteEntry(id);
      // Refresh to ensure consistency
      await loadEntries();
    } catch (error) {
      // Revert optimistic update on error
      await loadEntries();
      console.error('Failed to delete entry:', error);
      throw error;
    }
  };

  const getEntry = async (id) => {
    if (!currentUser) {
      throw new Error('User must be logged in to get entries');
    }
    
    try {
      return await firestoreDb.getEntry(id);
    } catch (error) {
      console.error('Failed to get entry:', error);
      throw error;
    }
  };

  return {
    entries,
    loading,
    addEntry,
    updateEntry,
    deleteEntry,
    getEntry,
    refreshEntries: loadEntries,
  };
}

/**
 * Helper function to convert data URL to blob
 */
function dataURLtoBlob(dataURL) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Process entry images - compress and upload to Firebase Storage
 * Optimized to parallelize uploads where possible
 */
async function processEntryImages(entryData, existingId = null, userId = null) {
  const processed = { ...entryData };

  // Helper function to process bib photo
  const processBibPhoto = async () => {
    if (entryData.bibPhoto && entryData.bibPhoto instanceof File) {
      try {
        // Image is already processed (resized/compressed) in the form
        // Just upload it directly
        const originalUrl = await firestoreDb.uploadImage(userId, entryData.bibPhoto, 'bib-photos');
        
        return {
          original: originalUrl,
          cropped: originalUrl,
          useCropped: true,
        };
      } catch (error) {
        console.error('Failed to upload bib photo:', error);
        throw error;
      }
    } else if (entryData.bibPhoto && (typeof entryData.bibPhoto === 'object' && !(entryData.bibPhoto instanceof File))) {
      // Already processed, keep as is (for updates)
      if (entryData.bibPhoto.processed) {
        return {
          original: entryData.bibPhoto.original || entryData.bibPhoto.processed,
          cropped: entryData.bibPhoto.processed,
          useCropped: entryData.bibPhoto.useProcessed !== false,
        };
      }
      return entryData.bibPhoto;
    } else if (entryData.bibPhoto && typeof entryData.bibPhoto === 'string') {
      if (entryData.bibPhoto.startsWith('data:')) {
        try {
          const blob = dataURLtoBlob(entryData.bibPhoto);
          const url = await firestoreDb.uploadImage(userId, blob, 'bib-photos');
          return {
            original: url,
            cropped: url,
            useCropped: true,
          };
        } catch (error) {
          console.error('Failed to upload legacy bib photo:', error);
          return {
            original: entryData.bibPhoto,
            cropped: entryData.bibPhoto,
            useCropped: true,
          };
        }
      }
      return {
        original: entryData.bibPhoto,
        cropped: entryData.bibPhoto,
        useCropped: true,
      };
    }
    return entryData.bibPhoto;
  };

  // Helper function to process finisher photo
  const processFinisherPhoto = async () => {
    if (entryData.finisherPhoto && entryData.finisherPhoto instanceof File) {
      try {
        // Image is already processed (resized/compressed) in the form
        // Just upload it directly
        return await firestoreDb.uploadImage(userId, entryData.finisherPhoto, 'finisher-photos');
      } catch (error) {
        console.error('Failed to upload finisher photo:', error);
        throw error;
      }
    } else if (entryData.finisherPhoto) {
      const finisherPhoto = typeof entryData.finisherPhoto === 'string' 
        ? entryData.finisherPhoto 
        : entryData.finisherPhoto;
      
      if (typeof finisherPhoto === 'string' && finisherPhoto.startsWith('data:')) {
        try {
          const blob = dataURLtoBlob(finisherPhoto);
          return await firestoreDb.uploadImage(userId, blob, 'finisher-photos');
        } catch (error) {
          console.error('Failed to upload legacy finisher photo:', error);
          return finisherPhoto;
        }
      }
      return finisherPhoto;
    }
    return entryData.finisherPhoto;
  };

  // Helper function to process medal photo
  const processMedalPhoto = async () => {
    if (entryData.medalPhoto && entryData.medalPhoto instanceof File) {
      try {
        // Image is already processed (resized, background removed, cropped) in the form
        // Just upload it directly
        const processedUrl = await firestoreDb.uploadImage(userId, entryData.medalPhoto, 'medal-photos');
        
        return processedUrl;
      } catch (error) {
        console.error('Failed to upload medal photo:', error);
        throw error;
      }
    } else if (entryData.medalPhoto && (typeof entryData.medalPhoto === 'object' && !(entryData.medalPhoto instanceof File))) {
      if (entryData.medalPhoto.processed) {
        return entryData.medalPhoto.processed;
      } else if (entryData.medalPhoto.cropped) {
        return entryData.medalPhoto.cropped;
      } else if (entryData.medalPhoto.original) {
        return entryData.medalPhoto.original;
      }
      return entryData.medalPhoto;
    } else if (entryData.medalPhoto && typeof entryData.medalPhoto === 'string') {
      if (entryData.medalPhoto.startsWith('data:')) {
        try {
          const blob = dataURLtoBlob(entryData.medalPhoto);
          return await firestoreDb.uploadImage(userId, blob, 'medal-photos');
        } catch (error) {
          console.error('Failed to upload legacy medal photo:', error);
          return entryData.medalPhoto;
        }
      }
      return entryData.medalPhoto;
    }
    return entryData.medalPhoto;
  };

  // Upload images in parallel (they're already processed)
  const [bibPhoto, finisherPhoto, medalPhoto] = await Promise.all([
    processBibPhoto(),
    processFinisherPhoto(),
    processMedalPhoto(),
  ]);

  processed.bibPhoto = bibPhoto;
  processed.finisherPhoto = finisherPhoto;
  processed.medalPhoto = medalPhoto;

  // Process GPX file (independent of images)
  if (entryData.gpxFile && entryData.gpxFile instanceof File) {
    try {
      const routeData = await parseGPX(entryData.gpxFile);
      processed.routeData = routeData;
      processed.gpxFile = entryData.gpxFile.name; // Store filename
    } catch (error) {
      console.error('Failed to parse GPX file:', error);
      // Don't fail the whole entry if GPX parsing fails
    }
  } else if (entryData.routeData) {
    // Already processed
    processed.routeData = entryData.routeData;
  }

  return processed;
}
