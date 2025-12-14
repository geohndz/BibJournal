import { useState, useEffect } from 'react';
import { firestoreDb } from '../lib/firestoreDb';
import { useAuth } from '../contexts/AuthContext';
import { removeImageBackground, cropToContentBounds, blobToDataURL, fileToDataURL, compressImage } from '../lib/imageProcessing';
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
      
      // Wait for entries to refresh before returning
      await loadEntries();
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
 */
async function processEntryImages(entryData, existingId = null, userId = null) {
  const processed = { ...entryData };

  // Process bib photo (already cropped by user)
  if (entryData.bibPhoto && entryData.bibPhoto instanceof File) {
    try {
      // Compress the cropped image
      const compressed = await compressImage(entryData.bibPhoto);
      
      // Upload to Firebase Storage
      const originalBlob = dataURLtoBlob(await blobToDataURL(compressed));
      const originalUrl = await firestoreDb.uploadImage(userId, originalBlob, 'bib-photos');
      
      processed.bibPhoto = {
        original: originalUrl,
        cropped: originalUrl,
        useCropped: true,
      };
    } catch (error) {
      console.error('Failed to process bib photo:', error);
      throw error;
    }
  } else if (entryData.bibPhoto && (typeof entryData.bibPhoto === 'object' && !(entryData.bibPhoto instanceof File))) {
    // Already processed, keep as is (for updates)
    // Handle legacy format (processed) by converting to cropped
    if (entryData.bibPhoto.processed) {
      processed.bibPhoto = {
        original: entryData.bibPhoto.original || entryData.bibPhoto.processed,
        cropped: entryData.bibPhoto.processed,
        useCropped: entryData.bibPhoto.useProcessed !== false,
      };
    } else {
      processed.bibPhoto = entryData.bibPhoto;
    }
  } else if (entryData.bibPhoto && typeof entryData.bibPhoto === 'string') {
    // Check if it's a data URL (legacy) or already a storage URL
    if (entryData.bibPhoto.startsWith('data:')) {
      // Legacy data URL - convert to blob and upload
      try {
        const blob = dataURLtoBlob(entryData.bibPhoto);
        const url = await firestoreDb.uploadImage(userId, blob, 'bib-photos');
        processed.bibPhoto = {
          original: url,
          cropped: url,
          useCropped: true,
        };
      } catch (error) {
        console.error('Failed to upload legacy bib photo:', error);
        // Keep as is if upload fails
        processed.bibPhoto = {
          original: entryData.bibPhoto,
          cropped: entryData.bibPhoto,
          useCropped: true,
        };
      }
    } else {
      // Already a storage URL
      processed.bibPhoto = {
        original: entryData.bibPhoto,
        cropped: entryData.bibPhoto,
        useCropped: true,
      };
    }
  }

  // Process finisher photo
  if (entryData.finisherPhoto && entryData.finisherPhoto instanceof File) {
    try {
      const compressed = await compressImage(entryData.finisherPhoto);
      const blob = dataURLtoBlob(await blobToDataURL(compressed));
      processed.finisherPhoto = await firestoreDb.uploadImage(userId, blob, 'finisher-photos');
    } catch (error) {
      console.error('Failed to process finisher photo:', error);
      throw error;
    }
  } else if (entryData.finisherPhoto) {
    // Check if it's a data URL (legacy) or already a storage URL
    const finisherPhoto = typeof entryData.finisherPhoto === 'string' 
      ? entryData.finisherPhoto 
      : entryData.finisherPhoto;
    
    if (typeof finisherPhoto === 'string' && finisherPhoto.startsWith('data:')) {
      // Legacy data URL - convert to blob and upload
      try {
        const blob = dataURLtoBlob(finisherPhoto);
        processed.finisherPhoto = await firestoreDb.uploadImage(userId, blob, 'finisher-photos');
      } catch (error) {
        console.error('Failed to upload legacy finisher photo:', error);
        processed.finisherPhoto = finisherPhoto; // Keep as is if upload fails
      }
    } else {
      // Already a storage URL or object
      processed.finisherPhoto = finisherPhoto;
    }
  }

  // Process medal photo (remove background synchronously, store only processed version)
  if (entryData.medalPhoto && entryData.medalPhoto instanceof File) {
    try {
      // Compress original first
      const compressedOriginal = await compressImage(entryData.medalPhoto);
      
      // Remove background (this is the only version we'll save)
      const processedBlob = await removeImageBackground(compressedOriginal);
      
      // Crop to content bounds
      const croppedBlob = await cropToContentBounds(processedBlob);
      
      // Upload processed version to Storage
      const processedUrl = await firestoreDb.uploadImage(userId, croppedBlob, 'medal-photos');
      
      // Store only the processed version (as a string, like finisherPhoto)
      processed.medalPhoto = processedUrl;
    } catch (error) {
      console.error('Failed to process medal photo (background removal):', error);
      // If background removal fails, we could either:
      // 1. Throw error (user must retry)
      // 2. Upload original (but user wants only processed)
      // For now, we'll throw so user knows it failed
      throw new Error('Failed to remove background from medal photo. Please try again.');
    }
  } else if (entryData.medalPhoto && (typeof entryData.medalPhoto === 'object' && !(entryData.medalPhoto instanceof File))) {
    // Legacy format - convert to string (use processed if available, otherwise original)
    if (entryData.medalPhoto.processed) {
      processed.medalPhoto = entryData.medalPhoto.processed;
    } else if (entryData.medalPhoto.cropped) {
      processed.medalPhoto = entryData.medalPhoto.cropped;
    } else if (entryData.medalPhoto.original) {
      processed.medalPhoto = entryData.medalPhoto.original;
    } else {
      processed.medalPhoto = entryData.medalPhoto;
    }
  } else if (entryData.medalPhoto && typeof entryData.medalPhoto === 'string') {
    // Check if it's a data URL (legacy) or already a storage URL
    if (entryData.medalPhoto.startsWith('data:')) {
      // Legacy data URL - convert to blob and upload
      try {
        const blob = dataURLtoBlob(entryData.medalPhoto);
        const url = await firestoreDb.uploadImage(userId, blob, 'medal-photos');
        processed.medalPhoto = url;
      } catch (error) {
        console.error('Failed to upload legacy medal photo:', error);
        processed.medalPhoto = entryData.medalPhoto; // Keep as is if upload fails
      }
    } else {
      // Already a storage URL - keep as is
      processed.medalPhoto = entryData.medalPhoto;
    }
  }

  // Process GPX file
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
