import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Home } from './components/Home';
import { RaceForm } from './components/RaceForm';
import { RaceDetail } from './components/RaceDetail';
import { Login } from './components/Login';
import { Onboarding } from './components/Onboarding';
import { PublicProfile } from './components/PublicProfile';
import { useRaceEntries } from './hooks/useRaceEntries';
import { useAuth } from './contexts/AuthContext';
import { firestoreDb } from './lib/firestoreDb';
import { trackPageView, trackLogout } from './lib/analytics';

function App() {
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const { addEntry, updateEntry, refreshEntries } = useRaceEntries();
  const [currentView, setCurrentView] = useState('home');
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [onboardingStatus, setOnboardingStatus] = useState(null); // null = checking, true = completed, false = not completed
  const homeRef = useRef(null);

  // Check onboarding status when user is authenticated (only for non-public routes)
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      // Don't check onboarding for public profile routes
      if (location.pathname !== '/' && !location.pathname.startsWith('/login')) {
        return;
      }

      if (!currentUser) {
        setOnboardingStatus(null);
        return;
      }

      try {
        const profile = await firestoreDb.getUserProfile(currentUser.uid);
        if (profile && profile.onboardingCompleted) {
          setOnboardingStatus(true);
        } else {
          setOnboardingStatus(false);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // On error, assume onboarding is not completed to be safe
        setOnboardingStatus(false);
      }
    };

    checkOnboardingStatus();
  }, [currentUser, location.pathname]);

  // Track page views
  useEffect(() => {
    if (currentUser) {
      if (currentView === 'home') {
        trackPageView('Home');
      } else if (currentView === 'form') {
        trackPageView(selectedEntryId ? 'Edit Entry' : 'Add Entry');
      } else if (currentView === 'detail') {
        trackPageView('Race Detail');
      }
    }
  }, [currentView, currentUser, selectedEntryId]);

  const handleAddRace = () => {
    setSelectedEntryId(null);
    setCurrentView('form');
  };

  const handleViewRace = (entryId) => {
    setSelectedEntryId(entryId);
    setCurrentView('detail');
  };

  const handleEditRace = (entryId) => {
    // Set the entry ID and switch to form view
    // This will automatically "close" the detail view since only one overlay shows at a time
    setSelectedEntryId(entryId);
    setCurrentView('form');
  };

  const handleCloseForm = async () => {
    // Force refresh of entries in Home component by changing key
    setRefreshKey(prev => prev + 1);
    setCurrentView('home');
    setSelectedEntryId(null);
  };

  const handleCloseDetail = async () => {
    // Force refresh of entries in Home component by changing key
    setRefreshKey(prev => prev + 1);
    setCurrentView('home');
    setSelectedEntryId(null);
  };

  const handleDeleteEntry = async () => {
    // Force refresh after deletion
    setRefreshKey(prev => prev + 1);
  };

  const handleSaveRace = async (formData) => {
    if (selectedEntryId) {
      await updateEntry(selectedEntryId, formData);
    } else {
      await addEntry(formData);
    }
    // Force refresh after save by changing key
    // This will cause Home to remount and reload entries
    setRefreshKey(prev => prev + 1);
  };

  const handleLogout = async () => {
    try {
      trackLogout();
      await logout();
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  return (
    <Routes>
      {/* Public Profile Route - accessible without auth */}
      <Route path="/:username" element={<PublicProfile />} />
      
      {/* Protected Routes */}
      <Route path="*" element={
        <>
          {/* Show login if not authenticated */}
          {!currentUser ? (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <Login onClose={() => setShowLogin(false)} />
            </div>
          ) : (
            <>
              {/* Show loading while checking onboarding status */}
              {onboardingStatus === null ? (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                  </div>
                </div>
              ) : onboardingStatus === false ? (
                <Onboarding />
              ) : (
                <div className="min-h-screen bg-gray-50">
                  {/* Always show Home in the background */}
                  <Home
                    key={refreshKey}
                    onAddRace={handleAddRace}
                    onViewRace={handleViewRace}
                    currentUser={currentUser}
                    onLogout={handleLogout}
                  />
                  
                  {/* Form overlay */}
                  {currentView === 'form' && (
                    <RaceForm
                      entryId={selectedEntryId}
                      onClose={handleCloseForm}
                      onSave={handleSaveRace}
                    />
                  )}
                  
                  {/* Detail overlay */}
                  {currentView === 'detail' && selectedEntryId && (
                    <RaceDetail
                      entryId={selectedEntryId}
                      onClose={handleCloseDetail}
                      onEdit={handleEditRace}
                      onDelete={handleDeleteEntry}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </>
      } />
    </Routes>
  );
}

export default App;