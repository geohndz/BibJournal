import { useState, useEffect, useRef } from 'react';
import { useRaceEntries } from '../hooks/useRaceEntries';
import { ImageCropper } from './ImageCropper';
import { trackFormStarted, trackFormAbandoned, trackRaceCreated, trackRaceUpdated, trackImageUploaded, trackGPXUploaded } from '../lib/analytics';
import { getRandomRaceImage } from '../lib/imageUtils';
import confetti from 'canvas-confetti';

const RACE_TYPES = [
  'Marathon',
  'Half Marathon',
  '10K',
  '5K',
  'Trail Race',
  'Triathlon',
  'Ultra',
  'Other',
];

/**
 * Form component for adding/editing race entries
 */
export function RaceForm({ entryId, onClose, onSave }) {
  const { getEntry } = useRaceEntries();
  const [loading, setLoading] = useState(!!entryId);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showGPXInfo, setShowGPXInfo] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const locationInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const gpxInfoRef = useRef(null);
  const [formData, setFormData] = useState({
    raceName: '',
    raceType: '',
    location: '',
    date: '',
    results: {
      finishTime: '',
      overallPlace: '',
      ageGroupPlace: '',
      division: '',
    },
    bibPhoto: null,
    finisherPhoto: null,
    medalPhoto: null,
    gpxFile: null,
    notes: '',
  });

  const formSavedRef = useRef(false);

  // Set random background image on mount
  useEffect(() => {
    setBackgroundImage(getRandomRaceImage(entryId || Date.now()));
  }, [entryId]);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    // Only initialize when we're on step 1 (where the location input is visible)
    if (currentStep !== 1) return;

    // Wait for the input to be available and Google Maps to load
    const initAutocomplete = () => {
      if (locationInputRef.current && window.google && window.google.maps && window.google.maps.places) {
        // Clean up previous autocomplete if it exists
        if (autocompleteRef.current) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }

        const autocomplete = new window.google.maps.places.Autocomplete(
          locationInputRef.current,
          {
            types: ['geocode', 'establishment'],
            fields: ['formatted_address', 'name', 'geometry'],
          }
        );

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.formatted_address) {
            setFormData((prev) => ({
              ...prev,
              location: place.formatted_address,
            }));
          } else if (place.name) {
            setFormData((prev) => ({
              ...prev,
              location: place.name,
            }));
          }
        });

        autocompleteRef.current = autocomplete;
      } else if (locationInputRef.current && !window.google) {
        // If Google Maps isn't loaded yet, wait a bit and try again
        setTimeout(initAutocomplete, 100);
      }
    };

    // Small delay to ensure the input is rendered
    const timeoutId = setTimeout(initAutocomplete, 100);

    return () => {
      clearTimeout(timeoutId);
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [currentStep]);

  // Close GPX info tooltip when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (gpxInfoRef.current && !gpxInfoRef.current.contains(event.target)) {
        setShowGPXInfo(false);
      }
    }

    if (showGPXInfo) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showGPXInfo]);

  useEffect(() => {
    // Track form started
    trackFormStarted(!!entryId);
    
    if (entryId) {
      loadEntry();
    }
    
    // Track form abandoned on unmount if not saved
    return () => {
      if (!formSavedRef.current) {
        trackFormAbandoned(!!entryId);
      }
    };
  }, [entryId]);

  const loadEntry = async () => {
    try {
      const entry = await getEntry(entryId);
      if (entry) {
        setFormData({
          raceName: entry.raceName || '',
          raceType: entry.raceType || '',
          location: typeof entry.location === 'string' 
            ? entry.location 
            : (typeof entry.location === 'object' && entry.location !== null && entry.location.name
                ? entry.location.name
                : ''),
          date: entry.date ? (typeof entry.date === 'string' && entry.date.includes('T') 
            ? new Date(entry.date).toISOString().split('T')[0] 
            : entry.date.split('T')[0]) : '',
          results: {
            finishTime: entry.results?.finishTime || '',
            overallPlace: entry.results?.overallPlace || '',
            ageGroupPlace: entry.results?.ageGroupPlace || '',
            division: entry.results?.division || '',
          },
          bibPhoto: entry.bibPhoto || null,
          finisherPhoto: entry.finisherPhoto || null,
          medalPhoto: entry.medalPhoto || null,
          gpxFile: entry.gpxFile 
            ? (typeof entry.gpxFile === 'string' 
                ? { name: entry.gpxFile } 
                : (entry.gpxFile instanceof File 
                    ? entry.gpxFile 
                    : (typeof entry.gpxFile === 'object' && entry.gpxFile?.name 
                        ? entry.gpxFile 
                        : null)))
            : null,
          notes: entry.notes || '',
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to load entry:', error);
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleFileChange = (field, file) => {
    setFormData((prev) => ({
      ...prev,
      [field]: file,
    }));
    
    // Track image uploads
    if (file && field === 'bibPhoto') {
      trackImageUploaded('bib');
    } else if (file && field === 'finisherPhoto') {
      trackImageUploaded('finisher');
    } else if (file && field === 'medalPhoto') {
      trackImageUploaded('medal');
    } else if (file && field === 'gpxFile') {
      trackGPXUploaded();
    }
  };

  const handleNextStep = () => {
    // Validate step 1 before proceeding
    if (currentStep === 1) {
      if (!formData.raceName.trim()) {
        alert('Race name is required');
        return;
      }
      if (!formData.raceType) {
        alert('Race type is required');
        return;
      }
      if (!formData.location.trim()) {
        alert('Location is required');
        return;
      }
      if (!formData.date) {
        alert('Date is required');
        return;
      }
    }
    setCurrentStep(2);
  };

  const handlePreviousStep = () => {
    setCurrentStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Final validation
    if (!formData.raceName.trim()) {
      alert('Race name is required');
      return;
    }
    if (!formData.raceType) {
      alert('Race type is required');
      return;
    }
    if (!formData.location.trim()) {
      alert('Location is required');
      return;
    }
    if (!formData.date) {
      alert('Date is required');
      return;
    }
    if (!formData.bibPhoto && !entryId) {
      alert('Bib photo is required');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      formSavedRef.current = true;
      
      // Track race created/updated
      const hasBibPhoto = !!formData.bibPhoto;
      const hasFinisherPhoto = !!formData.finisherPhoto;
      const hasMedalPhoto = !!formData.medalPhoto;
      const hasGPX = !!formData.gpxFile;
      
      if (entryId) {
        trackRaceUpdated(formData.raceType);
      } else {
        trackRaceCreated(formData.raceType, hasBibPhoto, hasFinisherPhoto, hasMedalPhoto, hasGPX);
        
        // Confetti animation for new race!
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

        function randomInRange(min, max) {
          return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function() {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);
          
          // Launch confetti from both sides
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
          });
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
          });
        }, 250);
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to save:', error);
      // Show more specific error message
      let errorMessage = 'Failed to save race entry. Please try again.';
      if (error.message) {
        if (error.message.includes('permission') || error.message.includes('Permission')) {
          errorMessage = 'Permission denied. Please check your Firestore security rules.';
        } else if (error.message.includes('network') || error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">Loading...</div>
      </div>
    );
  }

  if (!backgroundImage) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-5xl bg-white rounded-lg shadow-2xl overflow-hidden flex max-h-[90vh]">
        {/* Left Side - Image (40%) */}
        <div 
          className="hidden md:block w-[40%] relative"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {/* Dark gradient overlay from top */}
          <div 
            className="absolute inset-0 z-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.3) 20%, rgba(0, 0, 0, 0.2) 40%, transparent 60%)',
            }}
          ></div>
        </div>

        {/* Right Side - Form (60%) */}
        <div className="w-full md:w-[60%] flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {entryId ? 'Edit Race' : 'Add Race'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">Step {currentStep} of 2</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>


          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-6">
            {currentStep === 1 ? (
              /* Step 1: Typed Information */
              <div className="space-y-6">
                {/* Race Name and Type - Side by Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Race Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.raceName}
                      onChange={(e) => handleChange('raceName', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Race Type <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={formData.raceType}
                        onChange={(e) => handleChange('raceType', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none pr-10 cursor-pointer"
                        required
                      >
                        <option value="">Select race type</option>
                        {RACE_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      {/* Custom dropdown arrow */}
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location and Date - Side by Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={locationInputRef}
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      placeholder="City, Track Name, or Trail Name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleChange('date', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

            {/* Race Results */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Race Results (Optional)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Finish Time
                  </label>
                  <input
                    type="text"
                    value={formData.results.finishTime}
                    onChange={(e) => handleChange('results.finishTime', e.target.value)}
                    placeholder="HH:MM:SS"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Overall Place
                  </label>
                  <input
                    type="number"
                    value={formData.results.overallPlace}
                    onChange={(e) => handleChange('results.overallPlace', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age Group Place
                  </label>
                  <input
                    type="number"
                    value={formData.results.ageGroupPlace}
                    onChange={(e) => handleChange('results.ageGroupPlace', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Division
                  </label>
                  <input
                    type="text"
                    value={formData.results.division}
                    onChange={(e) => handleChange('results.division', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
              </div>
            ) : (
              /* Step 2: Media */
              <div className="space-y-6">
                {/* Bib Photo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bib Photo <span className="text-red-500">*</span>
                  </label>
                  <FileInput
                    value={formData.bibPhoto}
                    onChange={(file) => handleFileChange('bibPhoto', file)}
                    accept="image/*"
                    required={!entryId || !formData.bibPhoto}
                    enableCrop={true}
                  />
                </div>

                {/* Finisher Photo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Finisher Photo (Optional)
                  </label>
                  <FileInput
                    value={formData.finisherPhoto}
                    onChange={(file) => handleFileChange('finisherPhoto', file)}
                    accept="image/*"
                  />
                </div>

                {/* Medal Photo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medal Photo (Optional)
                  </label>
                  <FileInput
                    value={formData.medalPhoto}
                    onChange={(file) => handleFileChange('medalPhoto', file)}
                    accept="image/*"
                    enableCrop={false}
                  />
                </div>

                {/* GPX File */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      GPX File (Optional)
                    </label>
                    <div className="relative flex items-center" ref={gpxInfoRef}>
                      <button
                        type="button"
                        onClick={() => setShowGPXInfo(!showGPXInfo)}
                        onMouseEnter={() => setShowGPXInfo(true)}
                        className="text-gray-400 hover:text-gray-600 transition-colors flex items-center"
                        aria-label="What is a GPX file?"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </button>
                      
                      {/* Tooltip */}
                      {showGPXInfo && (
                        <div className="absolute left-0 bottom-full mb-2 w-72 bg-gray-900 text-white text-sm rounded-lg p-4 shadow-xl z-50">
                          <div className="absolute bottom-0 left-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                          <h4 className="font-semibold mb-2">What is a GPX file?</h4>
                          <p className="mb-3 text-gray-200">
                            GPX (GPS Exchange Format) is a file that contains your race route data, including coordinates, elevation, and distance.
                          </p>
                          <h5 className="font-semibold mb-2">Where to get it:</h5>
                          <ul className="list-disc list-inside space-y-1 text-gray-200 mb-2">
                            <li>Strava (export from activity)</li>
                            <li>Garmin Connect</li>
                            <li>Apple Watch (via Health app)</li>
                            <li>Race organizers (often provided)</li>
                            <li>Other fitness tracking apps</li>
                          </ul>
                          <p className="text-xs text-gray-300 mt-2">
                            Uploading a GPX file will display your route on a map in your race entry.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <FileInput
                    value={formData.gpxFile}
                    onChange={(file) => handleFileChange('gpxFile', file)}
                    accept=".gpx"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Add your personal reflections..."
                  />
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-6">
              {currentStep === 1 ? (
                <div></div>
              ) : (
                <button
                  type="button"
                  onClick={handlePreviousStep}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
              )}
              <div className="flex gap-3">
                {currentStep === 1 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? 'Saving...' : entryId ? 'Update Race' : 'Create Race'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * File input component with preview and optional cropping
 */
function FileInput({ value, onChange, accept, required = false, enableCrop = false }) {
  const [showCropper, setShowCropper] = useState(false);
  const [tempFile, setTempFile] = useState(null);
  const isImage = accept?.includes('image');
  const isGPX = accept?.includes('.gpx');

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (enableCrop && isImage) {
        // Show cropper for bib/medal photos
        setTempFile(file);
        setShowCropper(true);
      } else {
        onChange(file);
      }
    }
  };

  const handleCropComplete = (croppedDataURL) => {
    // Convert data URL to File
    fetch(croppedDataURL)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], tempFile.name, { type: blob.type });
        onChange(file);
        setShowCropper(false);
        setTempFile(null);
      });
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setTempFile(null);
    // Reset file input
    const input = document.querySelector('input[type="file"]');
    if (input) input.value = '';
  };

  const getPreviewSrc = () => {
    if (!value) return null;
    if (typeof value === 'string') return value; // Data URL
    if (value instanceof File) return URL.createObjectURL(value);
    if (typeof value === 'object' && value.original) return value.original;
    return null;
  };

  const previewSrc = getPreviewSrc();
  const cropperSrc = tempFile ? URL.createObjectURL(tempFile) : null;

  const getFileName = () => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (value instanceof File) return value.name || '';
    if (typeof value === 'object' && value !== null) {
      if (value.name && typeof value.name === 'string') return value.name;
      if (value.original) return 'Current image';
    }
    return '';
  };
  
  const fileName = getFileName();

  return (
    <>
      {showCropper && cropperSrc && (
        <ImageCropper
          imageSrc={cropperSrc}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
      <div>
        <div className="flex items-center gap-4">
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Choose File
            <input
              type="file"
              onChange={handleFileChange}
              accept={accept}
              required={required && !value}
              className="hidden"
            />
          </label>
          {fileName && (
            <span className="text-sm text-gray-600">{fileName}</span>
          )}
        </div>
        {previewSrc && isImage && (
          <div className="mt-4">
            <img
              src={previewSrc}
              alt="Preview"
              className="max-w-xs max-h-64 rounded-lg border border-gray-200"
            />
          </div>
        )}
      </div>
    </>
  );
}
