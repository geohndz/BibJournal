import { useState, useEffect, useRef } from 'react';
import { Home } from './components/Home';
import { RaceForm } from './components/RaceForm';
import { RaceDetail } from './components/RaceDetail';
import { Login } from './components/Login';
import { useRaceEntries } from './hooks/useRaceEntries';
import { useAuth } from './contexts/AuthContext';
import { trackPageView, trackLogout } from './lib/analytics';

function App() {
  const { currentUser, logout } = useAuth();
  const { addEntry, updateEntry, refreshEntries } = useRaceEntries();
  const [currentView, setCurrentView] = useState('home');
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const homeRef = useRef(null);

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
    // Refresh entries when form closes to ensure latest data is shown
    if (refreshEntries) {
      await refreshEntries();
    }
    setCurrentView('home');
    setSelectedEntryId(null);
  };

  const handleCloseDetail = async () => {
    // Refresh entries when detail closes (in case entry was deleted)
    if (refreshEntries) {
      await refreshEntries();
    }
    setCurrentView('home');
    setSelectedEntryId(null);
  };

  const handleSaveRace = async (formData) => {
    if (selectedEntryId) {
      await updateEntry(selectedEntryId, formData);
    } else {
      await addEntry(formData);
    }
    // Ensure entries are refreshed before closing modal
    // The hook should handle this, but we'll add a small delay to ensure it completes
    await new Promise(resolve => setTimeout(resolve, 300));
  };

  const handleLogout = async () => {
    try {
      trackLogout();
      await logout();
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  // Show login if not authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Login onClose={() => setShowLogin(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Always show Home in the background */}
      <Home
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
        />
      )}
    </div>
  );
}

export default App;