import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firestoreDb } from '../lib/firestoreDb';
import { getRandomRaceImage } from '../lib/imageUtils';
import { ImageCropper } from './ImageCropper';
import logoSvg from '../assets/Bib Journal-light.svg';
import { Upload, X, ChevronDown } from 'lucide-react';

const USERNAME_REGEX = /^(?=.*[a-zA-Z])[a-zA-Z0-9._-]{6,}$/;

export function OnboardingStep1({ formData, setFormData, onNext }) {
  const { currentUser } = useAuth();
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [usernameError, setUsernameError] = useState('');
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [cropperSrc, setCropperSrc] = useState(null);
  const fileInputRef = useRef(null);
  const usernameCheckTimeoutRef = useRef(null);
  const locationInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Set random background image on mount
  useEffect(() => {
    setBackgroundImage(getRandomRaceImage());
  }, []);

  // Auto-populate name from Google OAuth if available
  useEffect(() => {
    if (currentUser?.displayName && !formData.name) {
      setFormData(prev => ({ ...prev, name: currentUser.displayName }));
    }
  }, [currentUser]);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 50; // Try for up to 5 seconds (50 * 100ms)

    // Wait for the input to be available and Google Maps to load
    const initAutocomplete = () => {
      if (locationInputRef.current && window.google && window.google.maps && window.google.maps.places) {
        // Clean up previous autocomplete if it exists
        if (autocompleteRef.current) {
          try {
            window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
          } catch (e) {
            // Ignore cleanup errors
          }
        }

        try {
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
          console.log('Google Places Autocomplete initialized successfully');
        } catch (error) {
          console.error('Error initializing Google Places Autocomplete:', error);
        }
      } else {
        // If Google Maps isn't loaded yet or input isn't ready, wait and try again
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(initAutocomplete, 100);
        } else {
          console.warn('Google Places Autocomplete: Max retries reached. Google Maps API may not be loaded.');
        }
      }
    };

    // Small delay to ensure the input is rendered
    const timeoutId = setTimeout(initAutocomplete, 200);

    return () => {
      clearTimeout(timeoutId);
      if (autocompleteRef.current) {
        try {
          window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
        } catch (e) {
          // Ignore errors during cleanup
        }
        autocompleteRef.current = null;
      }
    };
  }, []);

  // Validate username format
  const validateUsername = (username) => {
    if (!username) {
      setUsernameError('');
      setUsernameAvailable(null);
      return false;
    }

    if (username.length < 6) {
      setUsernameError('Username must be at least 6 characters');
      setUsernameAvailable(false);
      return false;
    }

    if (!USERNAME_REGEX.test(username)) {
      setUsernameError('Username can only contain letters, numbers, hyphens, underscores, and periods. Must contain at least one letter.');
      setUsernameAvailable(false);
      return false;
    }

    setUsernameError('');
    return true;
  };

  // Check username availability with debounce
  const checkUsernameAvailability = async (username) => {
    if (!username || !validateUsername(username)) {
      return;
    }

    // Clear previous timeout
    if (usernameCheckTimeoutRef.current) {
      clearTimeout(usernameCheckTimeoutRef.current);
    }

    // Debounce the check
    usernameCheckTimeoutRef.current = setTimeout(async () => {
      setUsernameChecking(true);
      try {
        const available = await firestoreDb.checkUsernameAvailability(username);
        setUsernameAvailable(available);
        if (!available) {
          setUsernameError('This username is already taken');
        } else {
          // Clear any previous errors if username is available
          if (usernameError === 'Error checking username availability') {
            setUsernameError('');
          }
        }
      } catch (error) {
        console.error('Error checking username:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        // Check if it's an index error
        if (error.code === 'failed-precondition' || error.message?.includes('index')) {
          setUsernameError('Database index is being set up. Please try again in a moment.');
        } else if (error.code === 'permission-denied' || error.message?.includes('permission')) {
          setUsernameError('Permission denied. Please check Firestore security rules.');
        } else {
          // For other errors, show a more helpful message
          const errorMsg = error.message || 'Unknown error occurred';
          setUsernameError(`Unable to verify username: ${errorMsg}`);
        }
        setUsernameAvailable(null); // Don't set to false, keep it as null (unknown)
      } finally {
        setUsernameChecking(false);
      }
    }, 500);
  };

  const handleUsernameChange = (e) => {
    const username = e.target.value;
    setFormData(prev => ({ ...prev, username }));
    validateUsername(username);
    checkUsernameAvailability(username);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    try {
      // Create preview URL and show cropper
      const previewUrl = URL.createObjectURL(file);
      setCropperSrc(previewUrl);
      setShowCropper(true);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing image');
    }
  };

  const handleCropComplete = (croppedImageDataUrl) => {
    // Convert data URL to blob/file
    fetch(croppedImageDataUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' });
        setFormData(prev => ({ 
          ...prev, 
          profilePhoto: { file, preview: croppedImageDataUrl } 
        }));
        setShowCropper(false);
        setCropperSrc(null);
        // Clean up the original preview URL
        if (cropperSrc) {
          URL.revokeObjectURL(cropperSrc);
        }
      })
      .catch(error => {
        console.error('Error converting cropped image:', error);
        alert('Error processing cropped image');
        setShowCropper(false);
        setCropperSrc(null);
      });
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    if (cropperSrc) {
      URL.revokeObjectURL(cropperSrc);
    }
    setCropperSrc(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = () => {
    if (formData.profilePhoto?.preview) {
      URL.revokeObjectURL(formData.profilePhoto.preview);
    }
    setFormData(prev => ({ ...prev, profilePhoto: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate all required fields
    if (!formData.name?.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!formData.username?.trim()) {
      alert('Please enter a username');
      return;
    }

    if (!validateUsername(formData.username)) {
      return;
    }

    if (usernameChecking) {
      alert('Please wait while we check username availability');
      return;
    }

    if (usernameAvailable === false) {
      alert('Please choose a different username');
      return;
    }

    // If username check failed but validation passed, warn user but allow proceeding
    if (usernameAvailable === null && usernameError) {
      const proceed = confirm('Could not verify username availability. Do you want to proceed anyway?');
      if (!proceed) {
        return;
      }
    }

    if (!formData.birthday) {
      alert('Please enter your birthday');
      return;
    }

    // Validate birthday is not in the future
    const birthdayDate = new Date(formData.birthday);
    const today = new Date();
    if (birthdayDate > today) {
      alert('Birthday cannot be in the future');
      return;
    }

    if (!formData.gender) {
      alert('Please select your gender');
      return;
    }

    if (!formData.location?.trim()) {
      alert('Please enter your location');
      return;
    }

    onNext();
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (usernameCheckTimeoutRef.current) {
        clearTimeout(usernameCheckTimeoutRef.current);
      }
      if (formData.profilePhoto?.preview) {
        // Only revoke if it's a blob URL (not a data URL from cropper)
        if (formData.profilePhoto.preview.startsWith('blob:')) {
          URL.revokeObjectURL(formData.profilePhoto.preview);
        }
      }
      if (cropperSrc) {
        URL.revokeObjectURL(cropperSrc);
      }
    };
  }, [cropperSrc]);

  if (!backgroundImage) {
    return null;
  }

  return (
    <>
      {showCropper && cropperSrc && (
        <ImageCropper
          imageSrc={cropperSrc}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={1} // Lock to square for profile photos
        />
      )}
      <div className="fixed inset-0 flex z-50 bg-white">
      {/* Left Side - Image with Logo */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative"
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
        
        {/* Logo */}
        <div className="absolute top-8 left-8 z-10">
          <img 
            src={logoSvg} 
            alt="Bib Journal" 
            className="h-12 w-auto"
          />
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <img 
              src={logoSvg} 
              alt="Bib Journal" 
              className="h-8 w-auto"
            />
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Create Your Profile
            </h2>
            <p className="text-sm text-gray-600">
              Step 1 of 2: Tell us about yourself
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Profile Photo */}
            <div className="flex flex-col items-center">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Photo
              </label>
              {formData.profilePhoto?.preview ? (
                <div className="relative inline-block">
                  <img
                    src={formData.profilePhoto.preview}
                    alt="Profile preview"
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="profile-photo-input"
                  />
                  <label
                    htmlFor="profile-photo-input"
                    className="flex items-center justify-center w-24 h-24 rounded-full border-2 border-dashed border-gray-300 cursor-pointer hover:border-gray-400 transition-colors"
                  >
                    <Upload className="w-6 h-6 text-gray-400" />
                  </label>
                </div>
              )}
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                placeholder="Your full name"
              />
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
                  @
                </div>
                <input
                  id="username"
                  type="text"
                  value={formData.username || ''}
                  onChange={handleUsernameChange}
                  required
                  className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                    usernameError 
                      ? 'border-red-300 focus:ring-red-500' 
                      : usernameAvailable === true
                      ? 'border-green-300 focus:ring-green-500'
                      : 'border-gray-300 focus:ring-black'
                  }`}
                  placeholder="username"
                />
              </div>
              {usernameChecking && (
                <p className="mt-1 text-sm text-gray-500">Checking availability...</p>
              )}
              {usernameError && (
                <p className="mt-1 text-sm text-red-600">{usernameError}</p>
              )}
              {usernameAvailable === true && !usernameError && (
                <p className="mt-1 text-sm text-green-600">✓ Username available</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Must be at least 6 characters. Letters, numbers, hyphens, underscores, and periods allowed. Must contain at least one letter.
              </p>
            </div>

            {/* Birthday and Gender - Side by Side */}
            <div className="grid grid-cols-2 gap-4">
              {/* Birthday */}
              <div>
                <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 mb-2">
                  Birthday
                </label>
                <input
                  id="birthday"
                  type="date"
                  value={formData.birthday || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, birthday: e.target.value }))}
                  required
                  max={new Date().toISOString().split('T')[0]} // Can't be in the future
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                />
              </div>

              {/* Gender */}
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <div className="relative">
                  <select
                    id="gender"
                    value={formData.gender || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                    required
                    className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors bg-white appearance-none cursor-pointer"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                  {/* Custom dropdown arrow */}
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                ref={locationInputRef}
                id="location"
                type="text"
                value={formData.location || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                placeholder="City, State or Country"
              />
            </div>

            <button
              type="submit"
              disabled={usernameChecking || usernameAvailable === false}
              className="w-full bg-black text-white py-3 px-4 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    </div>
    </>
  );
}

