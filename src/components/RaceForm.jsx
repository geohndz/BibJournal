import { useState, useEffect } from 'react';
import { useRaceEntries } from '../hooks/useRaceEntries';
import { ImageCropper } from './ImageCropper';

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

  useEffect(() => {
    if (entryId) {
      loadEntry();
    }
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
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
      onClose();
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save race entry. Please try again.');
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

  return (
    <div className="fixed inset-0 bg-black/50 overflow-y-auto z-50">
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              {entryId ? 'Edit Race' : 'Add Race'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Race Name */}
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

            {/* Race Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Race Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.raceType}
                onChange={(e) => handleChange('raceType', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="">Select race type</option>
                {RACE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="City, Track Name, or Trail Name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            {/* Date */}
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

            {/* Race Results */}
            <div className="border-t border-gray-200 pt-6">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GPX File (Optional)
              </label>
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

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : entryId ? 'Update' : 'Save'}
              </button>
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
