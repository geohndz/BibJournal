import { removeBackground } from '@imgly/background-removal';

/**
 * Process an image to remove its background
 * @param {File|Blob|string} imageSource - The image file, blob, or URL
 * @returns {Promise<Blob>} - The processed image as a blob
 */
export async function removeImageBackground(imageSource) {
  try {
    console.log('Starting background removal...', {
      sourceType: imageSource?.constructor?.name,
      isFile: imageSource instanceof File,
      isBlob: imageSource instanceof Blob,
      isString: typeof imageSource === 'string',
      environment: import.meta.env.MODE,
      isProduction: import.meta.env.PROD,
    });
    
    // The library should handle model loading automatically
    // In production, it may need to load from CDN or bundled assets
    const blob = await removeBackground(imageSource);
    
    console.log('Background removal successful', {
      blobSize: blob.size,
      blobType: blob.type,
    });
    
    return blob;
  } catch (error) {
    console.error('Background removal failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      environment: import.meta.env.MODE,
      isProduction: import.meta.env.PROD,
    });
    
    // In production, if background removal fails, we should still allow the app to work
    // The error will be caught upstream and the original image will be used
    throw error;
  }
}

/**
 * Convert a blob to a data URL
 * @param {Blob} blob - The blob to convert
 * @returns {Promise<string>} - The data URL
 */
export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert a file to a data URL
 * @param {File} file - The file to convert
 * @returns {Promise<string>} - The data URL
 */
export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Crop an image to its content bounds (remove transparent padding)
 * @param {Blob|string} imageSource - The image blob or data URL
 * @returns {Promise<Blob>} - The cropped image
 */
export async function cropToContentBounds(imageSource) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // Convert blob to data URL if needed
    if (imageSource instanceof Blob) {
      blobToDataURL(imageSource).then(dataURL => {
        img.src = dataURL;
      }).catch(reject);
    } else {
      img.src = imageSource;
    }
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Draw image to get pixel data
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Find bounds of non-transparent pixels
      let minX = canvas.width;
      let minY = canvas.height;
      let maxX = 0;
      let maxY = 0;
      
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const alpha = data[(y * canvas.width + x) * 4 + 3];
          if (alpha > 0) { // Non-transparent pixel
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }
      
      // Add small padding (2px) to avoid edge clipping
      const padding = 2;
      minX = Math.max(0, minX - padding);
      minY = Math.max(0, minY - padding);
      maxX = Math.min(canvas.width - 1, maxX + padding);
      maxY = Math.min(canvas.height - 1, maxY + padding);
      
      // Calculate crop dimensions
      const cropWidth = maxX - minX + 1;
      const cropHeight = maxY - minY + 1;
      
      // If no content found, return original
      if (cropWidth <= 0 || cropHeight <= 0 || minX >= canvas.width || minY >= canvas.height) {
        canvas.toBlob(resolve, 'image/png');
        return;
      }
      
      // Create new canvas with cropped dimensions
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = cropWidth;
      croppedCanvas.height = cropHeight;
      const croppedCtx = croppedCanvas.getContext('2d');
      
      // Draw cropped portion
      croppedCtx.drawImage(
        canvas,
        minX, minY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      );
      
      // Convert to blob
      croppedCanvas.toBlob(resolve, 'image/png');
    };
    
    img.onerror = reject;
  });
}

/**
 * Resize an image to reduce dimensions (faster processing)
 * @param {File|Blob} file - The image file
 * @param {number} maxWidth - Maximum width (default 1200 for faster processing)
 * @param {number} maxHeight - Maximum height (default 1200 for faster processing)
 * @returns {Promise<Blob>} - The resized image
 */
export function resizeImage(file, maxWidth = 1200, maxHeight = 1200) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        // If image is already smaller, return original
        if (width >= img.width && height >= img.height) {
          if (file instanceof Blob) {
            resolve(file);
          } else {
            fileToDataURL(file).then(dataURL => {
              const blob = dataURLtoBlob(dataURL);
              resolve(blob);
            }).catch(reject);
          }
          return;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(resolve, 'image/jpeg', 0.95);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

/**
 * Helper to convert data URL to blob
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
 * Compress an image (now works on already-resized images)
 * @param {File|Blob} file - The image file (should already be resized)
 * @param {number} maxWidth - Maximum width (default 2000)
 * @param {number} maxHeight - Maximum height (default 2000)
 * @param {number} quality - Image quality (0-1, default 0.85)
 * @returns {Promise<Blob>} - The compressed image
 */
export function compressImage(file, maxWidth = 2000, maxHeight = 2000, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}
