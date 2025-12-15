import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { firestoreDb } from '../lib/firestoreDb';
import { formatDate } from '../lib/dateUtils';
import { getRaceTypeDisplay } from '../lib/raceUtils';
import { Medal } from 'lucide-react';
import logoSvg from '../assets/Bib Journal.svg';

export function PublicProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getEntries } = useRaceEntries();

  useEffect(() => {
    const loadProfile = async () => {
      if (!username) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Get profile by username
        const userProfile = await firestoreDb.getUserProfileByUsername(username);
        
        if (!userProfile) {
          setLoading(false);
          return;
        }

        setProfile(userProfile);

        // Load user's race entries
        const userId = userProfile.userId || userProfile.id;
        if (userId) {
          const userEntries = await firestoreDb.getEntries(userId);
          setEntries(userEntries || []);
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h1>
          <p className="text-gray-600 mb-4">The user profile you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/')}
            className="text-black hover:underline"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{
        backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        backgroundColor: '#f9fafb'
      }}
    >
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate('/')} className="cursor-pointer">
              <img 
                src={logoSvg} 
                alt="Bib Journal" 
                className="h-8 w-auto"
              />
            </button>
          </div>
        </div>
      </header>

      {/* Profile Section */}
      <div className="bg-white border-b border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center">
            {/* Profile Picture */}
            {profile.profilePhoto ? (
              <img
                src={profile.profilePhoto}
                alt={profile.name || 'Profile'}
                className="w-32 h-32 rounded-full object-cover mb-4"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-primary-600 text-white flex items-center justify-center text-4xl font-medium mb-4">
                {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            
            {/* Name */}
            {profile.name && (
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {profile.name}
              </h1>
            )}
            
            {/* Username */}
            {profile.username && (
              <p className="text-gray-500 text-lg mb-4">
                @{profile.username}
              </p>
            )}

            {/* Location */}
            {profile.location && (
              <p className="text-gray-600 text-sm">
                {profile.location}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Race Entries */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        {entries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No race entries yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12 overflow-visible">
            {entries.map((entry) => {
              const bibImageSrc = entry.bibPhoto
                ? (entry.bibPhoto.cropped
                    ? (entry.bibPhoto.useCropped !== false ? entry.bibPhoto.cropped : entry.bibPhoto.original)
                    : (entry.bibPhoto.processed 
                        ? (entry.bibPhoto.useProcessed !== false ? entry.bibPhoto.processed : entry.bibPhoto.original)
                        : entry.bibPhoto.original))
                : null;

              return (
                <div key={entry.id} className="flex flex-col items-center cursor-pointer group overflow-visible">
                  {bibImageSrc ? (
                    <div 
                      className="w-full mb-3 relative transition-transform duration-300 ease-out overflow-visible"
                      style={{ 
                        filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))'
                      }}
                    >
                      <img
                        src={bibImageSrc}
                        alt={`Bib for ${entry.raceName}`}
                        className="w-full h-auto object-contain rounded-lg"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-square bg-gray-100 flex items-center justify-center mb-3">
                      <svg
                        className="w-16 h-16 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="w-full text-center">
                    <h3 className="font-semibold text-gray-900 mb-1 flex items-center justify-center gap-2">
                      {entry.raceName}
                      {entry.isPersonalBest && (
                        <Medal className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 mb-1">
                      {getRaceTypeDisplay(entry)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {entry.date && formatDate(entry.date, 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

