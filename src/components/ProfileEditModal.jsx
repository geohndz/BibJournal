import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firestoreDb } from '../lib/firestoreDb';
import { calculateAge } from '../lib/ageUtils';
import { ImageCropper } from './ImageCropper';
import { Upload, X, ChevronDown } from 'lucide-react';

const USERNAME_REGEX = /^(?=.*[a-zA-Z])[a-zA-Z0-9._-]{6,}$/;

export function ProfileEditModal({ profile, onClose, onUpdate }) {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    profilePhoto: null,
    name: '',
    username: '',
    birthday: '',
    gender: '',
    location: '',
    experienceLevel: '',
  });
  const [usernameError, setUsernameError] = useState('');
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [cropperSrc, setCropperSrc] = useState(null);
  const fileInputRef = useRef(null);
  const usernameCheckTimeoutRef = useRef(null);
  const locationInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Initialize form data from profile
  useEffect(() => {
    if (profile) {
      setFormData({
        profilePhoto: profile.profilePhoto ? { preview: profile.profilePhoto } : null,
        name: profile.name || '',
        username: profile.username || '',
        birthday: profile.birthday || '',
        gender: profile.gender || '',
        location: profile.location || '',
        experienceLevel: profile.experienceLevel || '',
      });
    }
  }, [profile]);

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
    // If username hasn't changed, don't check
    if (username === profile?.username) {
      setUsernameAvailable(true);
      return;
    }

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
        }
      } catch (error) {
        console.error('Error checking username:', error);
        setUsernameError('Error checking username availability');
        setUsernameAvailable(false);
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

  // Initialize Google Places Autocomplete
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 50;

    const initAutocomplete = () => {
      if (locationInputRef.current && window.google && window.google.maps && window.google.maps.places) {
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
        } catch (error) {
          console.error('Error initializing Google Places Autocomplete:', error);
        }
      } else {
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(initAutocomplete, 100);
        }
      }
    };

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

  const handleSubmit = async (e) => {
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

    if (usernameAvailable === false && formData.username !== profile?.username) {
      alert('Please choose a different username');
      return;
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

    if (!formData.experienceLevel) {
      alert('Please select your experience level');
      return;
    }

    setSaving(true);

    try {
      // Upload profile photo if a new file was selected
      let profilePhotoUrl = formData.profilePhoto?.preview && !formData.profilePhoto?.file
        ? formData.profilePhoto.preview // Keep existing photo
        : null;

      if (formData.profilePhoto?.file) {
        profilePhotoUrl = await firestoreDb.uploadImage(
          currentUser.uid,
          formData.profilePhoto.file,
          'profile'
        );
      }

      // Calculate age from birthday
      const age = calculateAge(formData.birthday);

      // Update user profile
      const profileData = {
        name: formData.name,
        username: formData.username,
        birthday: formData.birthday,
        age: age,
        gender: formData.gender,
        location: formData.location,
        experienceLevel: formData.experienceLevel,
        profilePhoto: profilePhotoUrl,
      };

      await firestoreDb.upsertUserProfile(currentUser.uid, profileData);

      // Notify parent to refresh
      if (onUpdate) {
        onUpdate();
      }

      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (usernameCheckTimeoutRef.current) {
        clearTimeout(usernameCheckTimeoutRef.current);
      }
      if (formData.profilePhoto?.preview && formData.profilePhoto?.file) {
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

  if (!profile) {
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Edit Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
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
                  id="profile-photo-input-edit"
                />
                <label
                  htmlFor="profile-photo-input-edit"
                  className="flex items-center justify-center w-24 h-24 rounded-full border-2 border-dashed border-gray-300 cursor-pointer hover:border-gray-400 transition-colors"
                >
                  <Upload className="w-6 h-6 text-gray-400" />
                </label>
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-2">
              Name
            </label>
            <input
              id="edit-name"
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
            <label htmlFor="edit-username" className="block text-sm font-medium text-gray-700 mb-2">
              Username <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
                @
              </div>
              <input
                id="edit-username"
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
            {usernameAvailable === true && !usernameError && formData.username !== profile.username && (
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
              <label htmlFor="edit-birthday" className="block text-sm font-medium text-gray-700 mb-2">
                Birthday
              </label>
              <input
                id="edit-birthday"
                type="date"
                value={formData.birthday || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, birthday: e.target.value }))}
                required
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
              />
            </div>

            {/* Gender */}
            <div>
              <label htmlFor="edit-gender" className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <div className="relative">
                <select
                  id="edit-gender"
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
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="edit-location" className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              ref={locationInputRef}
              id="edit-location"
              type="text"
              value={formData.location || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
              placeholder="City, State or Country"
            />
          </div>

          {/* Experience Level */}
          <div>
            <label htmlFor="edit-experience" className="block text-sm font-medium text-gray-700 mb-2">
              Experience Level
            </label>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'beginner', title: 'Beginner', icon: '🏃' },
                { id: 'intermediate', title: 'Intermediate', icon: '🏃‍♂️' },
                { id: 'advanced', title: 'Advanced', icon: '🏃‍♀️' },
                { id: 'elite', title: 'Elite', icon: '🥇' },
              ].map((level) => {
                const isSelected = formData.experienceLevel === level.id;
                return (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, experienceLevel: level.id }))}
                    className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-black bg-gray-50 shadow-md'
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-black text-white rounded-full p-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    <div className="text-2xl mb-2">{level.icon}</div>
                    <h3 className="text-sm font-semibold text-gray-900">{level.title}</h3>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || usernameChecking || (usernameAvailable === false && formData.username !== profile.username)}
              className="flex-1 bg-black text-white py-3 px-4 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}

