import { useState } from 'react';
import { getRandomRaceImage } from '../lib/imageUtils';
import logoSvg from '../assets/Bib Journal-light.svg';
import { Check } from 'lucide-react';

const EXPERIENCE_LEVELS = [
  {
    id: 'beginner',
    title: 'Beginner',
    description: 'Just starting out with running',
    icon: '🏃',
  },
  {
    id: 'intermediate',
    title: 'Intermediate',
    description: 'Regular runner with some race experience',
    icon: '🏃‍♂️',
  },
  {
    id: 'advanced',
    title: 'Advanced',
    description: 'Experienced runner with many races',
    icon: '🏃‍♀️',
  },
  {
    id: 'elite',
    title: 'Elite',
    description: 'Competitive runner at the highest level',
    icon: '🥇',
  },
];

export function OnboardingStep2({ formData, setFormData, onComplete, onBack }) {
  const [backgroundImage] = useState(() => getRandomRaceImage());
  const [selectedLevel, setSelectedLevel] = useState(formData.experienceLevel || null);

  const handleSelect = (levelId) => {
    setSelectedLevel(levelId);
    setFormData(prev => ({ ...prev, experienceLevel: levelId }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedLevel) {
      alert('Please select your experience level');
      return;
    }

    onComplete();
  };

  return (
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
        <div className="w-full max-w-2xl">
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
              What's Your Experience Level?
            </h2>
            <p className="text-sm text-gray-600">
              Step 2 of 2: Help us personalize your experience
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {EXPERIENCE_LEVELS.map((level) => {
                const isSelected = selectedLevel === level.id;
                return (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => handleSelect(level.id)}
                    className={`relative p-6 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-black bg-gray-50 shadow-md scale-105'
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 bg-black text-white rounded-full p-1">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                    <div className="text-4xl mb-3">{level.icon}</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {level.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {level.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, experienceLevel: selectedLevel }));
                  if (onBack) onBack();
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 font-medium transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!selectedLevel}
                className="flex-1 bg-black text-white py-3 px-4 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Complete Profile
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

