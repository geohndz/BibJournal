import { useState, useRef, useCallback } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

/**
 * Component for cropping images
 * @param {string} imageSrc - Source image URL
 * @param {function} onCropComplete - Callback when crop is complete
 * @param {function} onCancel - Callback when crop is cancelled
 * @param {number} aspectRatio - Optional aspect ratio (e.g., 1 for square, undefined for free)
 */
export function ImageCropper({ imageSrc, onCropComplete, onCancel, aspectRatio }) {
  // Initialize with default crop to prevent undefined errors
  const [crop, setCrop] = useState({
    unit: '%',
    x: 5,
    y: 5,
    width: 90,
    height: aspectRatio ? (90 / aspectRatio) : 90,
  });
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);

  const onImageLoad = useCallback((e) => {
    // Set initial crop to be 90% of the image, centered
    // If aspect ratio is set, maintain it
    const initialCrop = {
      unit: '%',
      x: 5, // Center the crop: (100 - 90) / 2 = 5
      y: 5,
      width: 90,
      height: aspectRatio ? (90 / aspectRatio) : 90,
    };
    
    setCrop(initialCrop);
    setCompletedCrop(initialCrop);
  }, [aspectRatio]);

  const onCropChange = (newCrop) => {
    setCrop(newCrop);
  };

  const onCropCompleteInternal = (newCrop) => {
    setCompletedCrop(newCrop);
  };

  // Generate cropped image
  const generateCroppedImage = useCallback(async () => {
    // Use completedCrop if available, otherwise fall back to current crop
    const cropToUse = completedCrop || crop;
    
    if (!cropToUse || !imgRef.current || !previewCanvasRef.current) {
      console.error('Cannot generate crop: missing crop data or refs');
      return null;
    }

    const image = imgRef.current;
    const canvas = previewCanvasRef.current;

    if (!image || !cropToUse.width || !cropToUse.height) {
      console.error('Cannot generate crop: invalid crop dimensions');
      return null;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');

    // Calculate actual pixel values based on unit
    let cropX, cropY, cropWidth, cropHeight;
    
    if (cropToUse.unit === '%') {
      cropX = (cropToUse.x / 100) * image.naturalWidth;
      cropY = (cropToUse.y / 100) * image.naturalHeight;
      cropWidth = (cropToUse.width / 100) * image.naturalWidth;
      cropHeight = (cropToUse.height / 100) * image.naturalHeight;
    } else {
      // Pixel values
      cropX = cropToUse.x * scaleX;
      cropY = cropToUse.y * scaleY;
      cropWidth = cropToUse.width * scaleX;
      cropHeight = cropToUse.height * scaleY;
    }

    // Ensure valid values
    if (!cropWidth || !cropHeight || cropWidth <= 0 || cropHeight <= 0) {
      console.error('Invalid crop dimensions:', { cropWidth, cropHeight });
      return null;
    }

    canvas.width = cropWidth;
    canvas.height = cropHeight;

    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Failed to create blob from canvas');
          resolve(null);
          return;
        }
        blob.name = 'cropped.jpg';
        resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  }, [completedCrop, crop]);

  const handleDone = async () => {
    try {
      const croppedBlob = await generateCroppedImage();
      if (croppedBlob) {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            onCropComplete(reader.result);
          } else {
            console.error('Failed to read cropped image');
          }
        };
        reader.onerror = (error) => {
          console.error('Error reading cropped image:', error);
        };
        reader.readAsDataURL(croppedBlob);
      } else {
        console.error('Failed to generate cropped image');
      }
    } catch (error) {
      console.error('Error in handleDone:', error);
    }
  };

  const handleBackdropClick = (e) => {
    // Only close if clicking the backdrop itself, not the modal content
    if (e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => {
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Crop Image</h3>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Crop Area */}
        <div className="p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="w-full max-w-2xl">
              <ReactCrop
                crop={crop}
                onChange={onCropChange}
                onComplete={onCropCompleteInternal}
                aspect={aspectRatio}
                minWidth={50}
                minHeight={aspectRatio ? (50 / aspectRatio) : 50}
                keepSelection
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={imageSrc}
                  style={{ maxWidth: '100%', maxHeight: '70vh' }}
                  onLoad={onImageLoad}
                />
              </ReactCrop>
            </div>

            {/* Hidden canvas for generating cropped image */}
            <canvas
              ref={previewCanvasRef}
              style={{
                display: 'none',
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDone();
            }}
            disabled={!crop || !crop.width || !crop.height || (!completedCrop && !crop)}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
