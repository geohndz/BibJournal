import { useState, useEffect } from 'react';
import { Home } from './components/Home';
import { RaceForm } from './components/RaceForm';
import { RaceDetail } from './components/RaceDetail';
import { Login } from './components/Login';
import { useRaceEntries } from './hooks/useRaceEntries';
import { useAuth } from './contexts/AuthContext';
import { trackPageView, trackLogout } from './lib/analytics';

function App() {
  const { currentUser, logout } = useAuth();
  const { addEntry, updateEntry } = useRaceEntries();
  const [currentView, setCurrentView] = useState('home');
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  // Track page views
  useEffect(() => {
    if (currentUser) {
      if (currentView === 'home') {
        trackPageView('Home');
      } else if (currentView === 'form') {
        trackPageView(selectedEntryId ? 'Edit Race' : 'Add Race');
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
    setSelectedEntryId(entryId);
    setCurrentView('form');
  };

  const handleCloseForm = () => {
    setCurrentView('home');
    setSelectedEntryId(null);
  };

  const handleCloseDetail = () => {
    setCurrentView('home');
    setSelectedEntryId(null);
  };

  const handleSaveRace = async (formData) => {
    if (selectedEntryId) {
      await updateEntry(selectedEntryId, formData);
    } else {
      await addEntry(formData);
    }
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
      {currentView === 'home' && (
        <Home
          onAddRace={handleAddRace}
          onViewRace={handleViewRace}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}
      
      {currentView === 'form' && (
        <RaceForm
          entryId={selectedEntryId}
          onClose={handleCloseForm}
          onSave={handleSaveRace}
        />
      )}
      
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