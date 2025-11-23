import { useState } from 'react';

/**
 * Component for toggling between original and processed/cropped images
 */
export function ImageToggle({ original, cropped, useCropped = true, processed, useProcessed, alt = '' }) {
  // Support both formats: cropped (for bibs) and processed (for medals with background removal)
  const hasCropped = !!cropped;
  const hasProcessed = !!processed;
  const finalVersion = cropped || processed;
  const finalUseVersion = useCropped !== undefined ? useCropped : (useProcessed !== undefined ? useProcessed : true);
  
  // Determine which version label to use
  const versionLabel = hasCropped ? 'Cropped' : (hasProcessed ? 'Processed' : 'Cropped');
  
  const [showVersion, setShowVersion] = useState(finalUseVersion);

  const currentImage = showVersion ? finalVersion : original;
  const hasBothVersions = original && finalVersion && original !== finalVersion;

  if (!currentImage) return null;

  return (
    <div className="relative group">
      <img
        src={currentImage}
        alt={alt}
        className="w-full h-auto"
      />
      {hasBothVersions && (
        <button
          onClick={() => setShowVersion(!showVersion)}
          className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white px-3 py-1.5 rounded-md text-sm transition-colors"
          title={showVersion ? 'Show original' : `Show ${versionLabel.toLowerCase()}`}
        >
          {showVersion ? 'Original' : versionLabel}
        </button>
      )}
    </div>
  );
}
