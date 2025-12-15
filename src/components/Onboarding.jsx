import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firestoreDb } from '../lib/firestoreDb';
import { calculateAge } from '../lib/ageUtils';
import { OnboardingStep1 } from './OnboardingStep1';
import { OnboardingStep2 } from './OnboardingStep2';

export function Onboarding() {
  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    profilePhoto: null,
    name: '',
    username: '',
    birthday: '',
    gender: '',
    location: '',
    experienceLevel: '',
  });

  const handleStep1Next = () => {
    setCurrentStep(2);
  };

  const handleStep2Back = () => {
    setCurrentStep(1);
  };

  const handleComplete = async () => {
    if (!currentUser) {
      alert('You must be logged in to complete onboarding');
      return;
    }

    setLoading(true);

    try {
      // Upload profile photo if provided
      let profilePhotoUrl = null;
      if (formData.profilePhoto?.file) {
        profilePhotoUrl = await firestoreDb.uploadImage(
          currentUser.uid,
          formData.profilePhoto.file,
          'profile'
        );
      }

      // Calculate age from birthday
      const age = calculateAge(formData.birthday);

      // Create user profile
      const profileData = {
        name: formData.name,
        username: formData.username,
        birthday: formData.birthday,
        age: age, // Store calculated age for convenience
        gender: formData.gender,
        location: formData.location,
        experienceLevel: formData.experienceLevel,
        profilePhoto: profilePhotoUrl,
        onboardingCompleted: true,
      };

      await firestoreDb.upsertUserProfile(currentUser.uid, profileData);

      // Profile created successfully - the app will detect this and redirect
      // Force a page reload to ensure state is refreshed
      window.location.reload();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Failed to complete onboarding. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Creating your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {currentStep === 1 && (
        <OnboardingStep1
          formData={formData}
          setFormData={setFormData}
          onNext={handleStep1Next}
        />
      )}
      {currentStep === 2 && (
        <OnboardingStep2
          formData={formData}
          setFormData={setFormData}
          onComplete={handleComplete}
          onBack={handleStep2Back}
        />
      )}
    </>
  );
}

