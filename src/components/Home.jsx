import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, LogOut, ChevronDown, Medal, Flag, Ruler, Gauge, Heart, Pencil } from 'lucide-react';
import { useRaceEntries } from '../hooks/useRaceEntries';
import { useViewMode } from '../hooks/useViewMode';
import { useAuth } from '../contexts/AuthContext';
import { firestoreDb } from '../lib/firestoreDb';
import { getRaceTypeDisplay, getRaceTypeForFilter } from '../lib/raceUtils';
import { calculateAge } from '../lib/ageUtils';
import { calculateStats } from '../lib/statsUtils';
import { EmptyState } from './EmptyState';
import { ViewToggle } from './ViewToggle';
import { FloatingActionButton } from './FloatingActionButton';
import { ProfileEditModal } from './ProfileEditModal';
import { formatDate } from '../lib/dateUtils';
import { trackViewModeChanged, trackFilterApplied, trackFilterCleared, trackRaceViewed, trackTotalEntries } from '../lib/analytics';
import logoSvg from '../assets/Bib Journal.svg';

/**
 * Home screen component displaying all race entries
 */
export function Home({ onAddRace, onViewRace, currentUser, onLogout }) {
  const { entries, loading, refreshEntries } = useRaceEntries();
  const { viewMode, setViewMode, VIEW_MODES } = useViewMode();
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [sortBy, setSortBy] = useState('date'); // 'date', 'type', 'name'
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showFABTooltip, setShowFABTooltip] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const userMenuRef = useRef(null);
  
  // Refresh entries when component mounts (this ensures fresh data when key changes)
  useEffect(() => {
    if (refreshEntries) {
      refreshEntries();
    }
  }, []); // Empty deps - only on mount

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Show FAB tooltip on mount for 5 seconds
  useEffect(() => {
    setShowFABTooltip(true);
    const timer = setTimeout(() => {
      setShowFABTooltip(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Track total entries count
  useEffect(() => {
    if (!loading && entries.length > 0) {
      trackTotalEntries(entries.length);
    }
  }, [entries.length, loading]);

  // Load user profile
  const loadUserProfile = async () => {
    if (!currentUser) return;
    
    try {
      const profile = await firestoreDb.getUserProfile(currentUser.uid);
      setUserProfile(profile);
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  useEffect(() => {
    loadUserProfile();
  }, [currentUser]);

  const handleProfileUpdate = async () => {
    await loadUserProfile();
  };

  // Calculate stats from entries
  const stats = useMemo(() => {
    if (entries.length === 0) return null;
    const calculatedStats = calculateStats(entries);
    // Debug: log stats to see what we're getting
    console.log('Calculated stats:', JSON.stringify(calculatedStats, null, 2));
    console.log('Entries sample:', entries.slice(0, 2).map(e => ({
      raceDistance: e.raceDistance,
      raceType: e.raceType,
      finishTime: e.results?.finishTime,
      results: e.results
    })));
    return calculatedStats;
  }, [entries]);

  // Track view mode changes
  const handleViewModeChange = (newMode) => {
    setViewMode(newMode);
    trackViewModeChanged(newMode);
  };

  // Track filter changes
  const handleFilterChange = (value) => {
    const newFilters = value ? [value] : [];
    setSelectedFilters(newFilters);
    if (newFilters.length > 0) {
      trackFilterApplied(newFilters);
    } else {
      trackFilterCleared();
    }
  };

  // Track race viewed
  const handleViewRace = (entryId) => {
    const entry = entries.find(e => e.id === entryId);
    if (entry) {
      trackRaceViewed(getRaceTypeForFilter(entry));
    }
    onViewRace(entryId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // Filter entries based on selected race types
  let filteredEntries = selectedFilters.length > 0
    ? entries.filter(entry => selectedFilters.includes(getRaceTypeForFilter(entry)))
    : entries;

  // Sort entries
  filteredEntries = [...filteredEntries].sort((a, b) => {
    switch (sortBy) {
      case 'type':
        // Sort by race type (A-Z)
        const typeA = getRaceTypeForFilter(a) || '';
        const typeB = getRaceTypeForFilter(b) || '';
        if (typeA !== typeB) {
          return typeA.localeCompare(typeB);
        }
        // If same type, sort by date (newest first)
        const typeDateA = a.date instanceof Date ? a.date : new Date(a.date || 0);
        const typeDateB = b.date instanceof Date ? b.date : new Date(b.date || 0);
        return typeDateB - typeDateA;
      
      case 'name':
        // Sort by race name (A-Z)
        const nameA = (a.raceName || '').toLowerCase();
        const nameB = (b.raceName || '').toLowerCase();
        if (nameA !== nameB) {
          return nameA.localeCompare(nameB);
        }
        // If same name, sort by date (newest first)
        const nameDateA = a.date instanceof Date ? a.date : new Date(a.date || 0);
        const nameDateB = b.date instanceof Date ? b.date : new Date(b.date || 0);
        return nameDateB - nameDateA;
      
      case 'date':
      default:
        // Sort by entry date (newest first)
        const dateA = a.date instanceof Date ? a.date : new Date(a.date || 0);
        const dateB = b.date instanceof Date ? b.date : new Date(b.date || 0);
        return dateB - dateA;
    }
  });

  // Get unique race types from entries, sorted
  const availableRaceTypes = [...new Set(entries.map(e => getRaceTypeForFilter(e)).filter(Boolean))].sort();

  // Group entries by race type when sorting by type
  const groupedByType = sortBy === 'type' 
    ? availableRaceTypes.reduce((acc, raceType) => {
        const typeEntries = filteredEntries.filter(e => getRaceTypeForFilter(e) === raceType);
        if (typeEntries.length > 0) {
          acc[raceType] = typeEntries;
        }
        return acc;
      }, {})
    : null;

  if (entries.length === 0) {
    return <EmptyState onAddRace={onAddRace} currentUser={currentUser} onLogout={onLogout} />;
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
            <div>
              <img 
                src={logoSvg} 
                alt="Bib Journal" 
                className="h-8 w-auto"
              />
            </div>
            <div className="flex items-center gap-4">
              <ViewToggle
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                VIEW_MODES={VIEW_MODES}
              />
              <button
                onClick={onAddRace}
                className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Entry
              </button>
              
              {/* User Avatar Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  {currentUser?.displayName ? (
                    currentUser.displayName.charAt(0).toUpperCase()
                  ) : currentUser?.email ? (
                    currentUser.email.charAt(0).toUpperCase()
                  ) : (
                    'U'
                  )}
                </button>
                
                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-200">
                      {currentUser?.displayName && (
                        <p className="text-sm font-semibold text-gray-900">
                          {currentUser.displayName}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 truncate">
                        {currentUser?.email || 'No email'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onLogout();
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Filter Bar */}
      {entries.length > 0 && (
        <div className="bg-white border-t border-b border-gray-200 sticky top-[73px] z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              {/* Left side - Showing count */}
              <div className="text-sm text-gray-600">
                {selectedFilters.length > 0 
                  ? `Showing: ${filteredEntries.length} ${filteredEntries.length === 1 ? 'race' : 'races'}`
                  : `Showing: All (${entries.length} ${entries.length === 1 ? 'race' : 'races'})`
                }
              </div>
              
              {/* Right side - Sort and Filter dropdowns with labels */}
              <div className="flex items-center gap-3">
                {/* Sort Dropdown */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700 font-medium">Sort:</label>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent appearance-none pr-8 cursor-pointer"
                    >
                      <option value="date">Date</option>
                      <option value="type">Race Type</option>
                      <option value="name">Name (A-Z)</option>
                    </select>
                    {/* Custom dropdown arrow */}
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </div>
                  </div>
                </div>

                {/* Vertical Divider */}
                <div className="h-6 w-px bg-gray-300"></div>

                {/* Filter Dropdown */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700 font-medium">Filter:</label>
                  <div className="relative">
                    <select
                      value={selectedFilters.length === 1 ? selectedFilters[0] : ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        handleFilterChange(value);
                      }}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent appearance-none pr-8 cursor-pointer"
                    >
                      <option value="">All Race Types</option>
                      {availableRaceTypes.map(raceType => (
                        <option key={raceType} value={raceType}>{raceType}</option>
                      ))}
                    </select>
                    {/* Custom dropdown arrow */}
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Section */}
      {userProfile && (
        <div className="bg-white border-b border-gray-200 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center">
              {/* Profile Picture with Edit Button */}
              <div className="relative inline-block mb-4">
                {userProfile.profilePhoto ? (
                  <img
                    src={userProfile.profilePhoto}
                    alt={userProfile.name || 'Profile'}
                    className="w-32 h-32 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-primary-600 text-white flex items-center justify-center text-4xl font-medium">
                    {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                {/* Edit Button */}
                <button
                  onClick={() => setShowEditProfile(true)}
                  className="absolute -top-1 -right-1 bg-black text-white rounded-full p-2 hover:bg-gray-800 transition-colors shadow-lg"
                  title="Edit Profile"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
              
              {/* Name */}
              {userProfile.name && (
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  {userProfile.name}
                </h1>
              )}
              
              {/* Username */}
              {userProfile.username && (
                <p className="text-gray-500 text-lg mb-4">
                  @{userProfile.username}
                </p>
              )}

              {/* Pills for Age, Location, and Experience Level */}
              <div className="flex flex-wrap items-center gap-2 justify-center mb-6">
                {/* Age pill */}
                {(userProfile.birthday || userProfile.age) && (
                  <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                    {userProfile.birthday 
                      ? `${calculateAge(userProfile.birthday)} years old`
                      : userProfile.age 
                      ? `${userProfile.age} years old`
                      : null}
                  </span>
                )}
                
                {/* Location pill */}
                {userProfile.location && (
                  <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                    {userProfile.location}
                  </span>
                )}
                
                {/* Experience Level pill */}
                {userProfile.experienceLevel && (
                  <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                    {userProfile.experienceLevel.charAt(0).toUpperCase() + userProfile.experienceLevel.slice(1)}
                  </span>
                )}
              </div>

              {/* Stats Cards - Sticky note style */}
              {stats && (
                <div className="flex flex-wrap gap-4 justify-center mt-6">
                  {/* Total Races - Blue */}
                  <div className="bg-blue-200/70 rounded-lg p-4 shadow-sm transform rotate-[-2deg] hover:rotate-0 transition-transform">
                    <div className="flex items-center gap-2 text-blue-700 mb-2">
                      <Flag className="w-4 h-4" />
                      <div className="text-xs font-medium uppercase tracking-wide">Total Races</div>
                    </div>
                    <div className="font-bold text-2xl text-gray-900">
                      {stats.totalRaces}
                    </div>
                  </div>

                  {/* Total Distance - Green */}
                  {stats.totalDistance > 0 && (
                    <div className="bg-green-200/70 rounded-lg p-4 shadow-sm transform rotate-[2deg] hover:rotate-0 transition-transform">
                      <div className="flex items-center gap-2 text-green-700 mb-2">
                        <Ruler className="w-4 h-4" />
                        <div className="text-xs font-medium uppercase tracking-wide">Total Distance</div>
                      </div>
                      <div className="font-bold text-2xl text-gray-900">
                        {stats.totalDistance.toFixed(1)} km
                      </div>
                    </div>
                  )}

                  {/* Average Pace - Yellow */}
                  <div className="bg-yellow-200/70 rounded-lg p-4 shadow-sm transform rotate-[-1.5deg] hover:rotate-0 transition-transform">
                    <div className="flex items-center gap-2 text-yellow-700 mb-2">
                      <Gauge className="w-4 h-4" />
                      <div className="text-xs font-medium uppercase tracking-wide">Average Pace</div>
                    </div>
                    <div className="font-bold text-2xl text-gray-900">
                      {stats.averagePace || 'N/A'}
                    </div>
                  </div>

                  {/* Favorite Distance - Pink/Red */}
                  {stats.favoriteDistance && (
                    <div className="bg-pink-200/70 rounded-lg p-4 shadow-sm transform rotate-[1.5deg] hover:rotate-0 transition-transform">
                      <div className="flex items-center gap-2 text-pink-700 mb-2">
                        <Heart className="w-4 h-4" />
                        <div className="text-xs font-medium uppercase tracking-wide">Favorite Distance</div>
                      </div>
                      <div className="font-bold text-2xl text-gray-900">
                        {stats.favoriteDistance}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No races match your filters.</p>
            <button
              onClick={() => {
                setSelectedFilters([]);
                trackFilterCleared();
              }}
              className="mt-4 text-black hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : sortBy === 'type' && groupedByType ? (
          // Grouped by race type view
          <div className="space-y-12">
            {Object.entries(groupedByType).map(([raceType, typeEntries], groupIndex) => (
              <div key={raceType} className="space-y-6">
                {/* Header with race type and line */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">{raceType}</h2>
                    <div className="flex-1 border-t border-gray-300"></div>
                  </div>
                </div>
                
                {/* Use grid view for all types when sorting by type */}
                <GridView entries={typeEntries} onViewRace={handleViewRace} onAddRace={onAddRace} showAddRace={false} />
                {/* Add "Add Entry" card at the end of the first type only */}
                {groupIndex === 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12 overflow-visible">
                    <AddRaceCard onAddRace={onAddRace} />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <>
            {viewMode === VIEW_MODES.GRID && (
              <GridView entries={filteredEntries} onViewRace={handleViewRace} onAddRace={onAddRace} />
            )}
            {viewMode === VIEW_MODES.LIST && (
              <ListView entries={filteredEntries} onViewRace={handleViewRace} onAddRace={onAddRace} />
            )}
            {viewMode === VIEW_MODES.COLUMN && (
              <ColumnView entries={filteredEntries} onViewRace={handleViewRace} onAddRace={onAddRace} />
            )}
          </>
        )}
      </main>

      {/* Floating Action Button */}
      <FloatingActionButton showTooltip={showFABTooltip} />

      {/* Profile Edit Modal */}
      {showEditProfile && userProfile && (
        <ProfileEditModal
          profile={userProfile}
          onClose={() => setShowEditProfile(false)}
          onUpdate={handleProfileUpdate}
        />
      )}
    </div>
  );
}

/**
 * Add Entry Card component - rectangular with dotted lines and plus icon
 */
function AddRaceCard({ onAddRace }) {
  return (
    <div
      onClick={onAddRace}
      className="flex flex-col items-center cursor-pointer group overflow-visible"
    >
      <div 
        className="w-full mb-3 relative transition-transform duration-300 ease-out overflow-visible rounded-lg flex items-center justify-center bg-gray-50 hover:bg-gray-100"
        style={{
          aspectRatio: '4/3',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {/* SVG border with spaced dashes */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ borderRadius: '0.5rem' }}
        >
          <rect
            x="1"
            y="1"
            width="calc(100% - 2px)"
            height="calc(100% - 2px)"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="2"
            strokeDasharray="8 8"
            rx="0.5rem"
            className="group-hover:stroke-gray-400 transition-colors"
          />
        </svg>
        <Plus className="w-12 h-12 text-gray-400 group-hover:text-gray-600 transition-colors relative z-10" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-gray-900 mb-1">Add Race</h3>
      </div>
    </div>
  );
}

/**
 * Grid view component (masonry-style)
 */
function GridView({ entries, onViewRace, onAddRace, showAddRace = true }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12 overflow-visible">
      {entries.map((entry) => (
        <RaceCard key={entry.id} entry={entry} onViewRace={onViewRace} />
      ))}
      {showAddRace && <AddRaceCard onAddRace={onAddRace} />}
    </div>
  );
}

/**
 * List view component - horizontal layout with small image and text
 */
function ListView({ entries, onViewRace, onAddRace, showAddRace = true }) {
  return (
    <div>
      {entries.map((entry, index) => (
        <React.Fragment key={entry.id}>
          <ListItemCard entry={entry} onViewRace={onViewRace} />
          {index < entries.length - 1 && (
            <div className="border-t border-gray-200 my-10"></div>
          )}
        </React.Fragment>
      ))}
      {showAddRace && entries.length > 0 && (
        <div className="border-t border-gray-200 mt-10"></div>
      )}
      {showAddRace && (
        <div
          onClick={onAddRace}
          className="flex items-center gap-4 cursor-pointer group overflow-visible py-3 px-3 rounded-lg transition-colors duration-200 hover:bg-gray-100"
        >
          <div className="w-24 h-24 flex-shrink-0 rounded-lg flex items-center justify-center bg-gray-50 hover:bg-gray-100 relative">
            {/* SVG border with spaced dashes */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ borderRadius: '0.5rem' }}
            >
              <rect
                x="1"
                y="1"
                width="calc(100% - 2px)"
                height="calc(100% - 2px)"
                fill="none"
                stroke="#d1d5db"
                strokeWidth="2"
                strokeDasharray="8 8"
                rx="0.5rem"
                className="group-hover:stroke-gray-400 transition-colors"
              />
            </svg>
            <Plus className="w-8 h-8 text-gray-400 group-hover:text-gray-600 transition-colors relative z-10" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-1">Add Entry</h3>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Column view component - uses same RaceCard as grid view for consistency
 */
function ColumnView({ entries, onViewRace, onAddRace }) {
  return (
    <div className="max-w-2xl mx-auto space-y-20">
      {entries.map((entry) => (
        <RaceCard key={entry.id} entry={entry} onViewRace={onViewRace} />
      ))}
      <AddRaceCard onAddRace={onAddRace} />
    </div>
  );
}

/**
 * Generate a consistent random rotation based on entry ID
 * Returns a value between -3 and 3 degrees
 */
function getRotationForEntry(entryId) {
  // Convert string ID to numeric seed
  let seed = 0;
  if (typeof entryId === 'string') {
    // Hash the string to a number
    for (let i = 0; i < entryId.length; i++) {
      seed = ((seed << 5) - seed) + entryId.charCodeAt(i);
      seed = seed & seed; // Convert to 32-bit integer
    }
    seed = seed * 12345;
  } else {
    seed = (entryId || 0) * 12345;
  }
  
  const random = ((Math.abs(seed) * 9301 + 49297) % 233280) / 233280;
  // Return rotation between -3 and 3 degrees
  return (random * 6) - 3;
}

/**
 * Generate consistent corner positions based on entry ID
 * Returns positions for medal and finisher photo on opposite corners
 */
function getCornerPositions(entryId) {
  // Convert string ID to numeric seed
  let seed = 0;
  if (typeof entryId === 'string') {
    // Hash the string to a number
    for (let i = 0; i < entryId.length; i++) {
      seed = ((seed << 5) - seed) + entryId.charCodeAt(i);
      seed = seed & seed; // Convert to 32-bit integer
    }
  } else {
    seed = entryId || 0;
  }
  
  const random = ((Math.abs(seed) * 10973 + 571) % 233280) / 233280;
  
  // Define corner pairs (opposite corners)
  const cornerPairs = [
    { medal: 'top-left', finisher: 'bottom-right' },
    { medal: 'top-right', finisher: 'bottom-left' },
    { medal: 'bottom-left', finisher: 'top-right' },
    { medal: 'bottom-right', finisher: 'top-left' },
  ];
  
  // Select a random pair based on seed
  const pairIndex = Math.floor(random * cornerPairs.length);
  const result = cornerPairs[pairIndex];
  
  // Ensure we always return a valid object with both properties
  return result || { medal: 'top-left', finisher: 'bottom-right' };
}

/**
 * List item card component for list view - horizontal layout with small image
 */
function ListItemCard({ entry, onViewRace }) {
  const [isHovered, setIsHovered] = useState(false);

  const bibImageSrc = entry.bibPhoto
    ? (entry.bibPhoto.cropped
        ? (entry.bibPhoto.useCropped !== false ? entry.bibPhoto.cropped : entry.bibPhoto.original)
        : (entry.bibPhoto.processed 
            ? (entry.bibPhoto.useProcessed !== false ? entry.bibPhoto.processed : entry.bibPhoto.original)
            : entry.bibPhoto.original))
    : null;

  // Get consistent rotation for this entry
  const rotation = getRotationForEntry(entry.id);

  return (
    <div
      onClick={() => onViewRace(entry.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex items-center gap-4 cursor-pointer group overflow-visible py-3 px-3 rounded-lg transition-colors duration-200 ${
        isHovered ? '' : ''
      }`}
      style={{
        backgroundColor: isHovered ? '#e5e7eb' : 'transparent'
      }}
    >
      {/* Small bib image without overlays */}
      {bibImageSrc ? (
        <div 
          className="w-24 h-24 flex-shrink-0 relative transition-transform duration-300 ease-out overflow-visible"
          style={{ 
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = `rotate(0deg) scale(1.05)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = `rotate(${rotation}deg) scale(1)`;
          }}
        >
          <img
            src={bibImageSrc}
            alt={`Bib for ${entry.raceName}`}
            className="w-24 h-24 object-contain rounded-lg"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="w-24 h-24 flex-shrink-0 bg-gray-100 flex items-center justify-center rounded">
          <svg
            className="w-8 h-8 text-gray-400"
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
      
      {/* Text content on the right */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 mb-1 truncate flex items-center gap-2">
          {entry.raceName}
          {entry.isPersonalBest && (
            <Medal className="w-5 h-5 text-yellow-500 flex-shrink-0" />
          )}
        </h3>
        <p className="text-sm text-gray-500 mb-1">
          {getRaceTypeDisplay(entry)} {entry.location && `• ${entry.location}`}
        </p>
        <p className="text-xs text-gray-400">
          {entry.date && formatDate(entry.date, 'MMM d, yyyy')}
        </p>
        {entry.results?.finishTime && (
          <p className="text-sm text-gray-600 mt-1">
            Finish Time: {entry.results.finishTime}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Race card component for grid view with scrapbook overlay
 */
function RaceCard({ entry, onViewRace }) {
  const bibImageSrc = entry.bibPhoto
    ? (entry.bibPhoto.cropped
        ? (entry.bibPhoto.useCropped !== false ? entry.bibPhoto.cropped : entry.bibPhoto.original)
        : (entry.bibPhoto.processed 
            ? (entry.bibPhoto.useProcessed !== false ? entry.bibPhoto.processed : entry.bibPhoto.original)
            : entry.bibPhoto.original))
    : null;

  // Medal photo (always background-removed, stored as string URL)
  const medalImageSrc = typeof entry.medalPhoto === 'string' 
    ? entry.medalPhoto 
    : (entry.medalPhoto?.processed || entry.medalPhoto?.original || null);

  const finisherImageSrc = entry.finisherPhoto;

  // Get consistent rotation and corner positions for this entry
  const rotation = getRotationForEntry(entry.id);
  const corners = getCornerPositions(entry.id) || { medal: 'top-left', finisher: 'bottom-right' };

  // Refs for medal and finisher elements
  const medalRef = useRef(null);
  const finisherRef = useRef(null);

  // Helper function to convert string ID to numeric seed
  const getIdSeed = (id, multiplier = 1) => {
    if (typeof id === 'string') {
      let seed = 0;
      for (let i = 0; i < id.length; i++) {
        seed = ((seed << 5) - seed) + id.charCodeAt(i);
        seed = seed & seed;
      }
      return Math.abs(seed) * multiplier;
    }
    return (id || 0) * multiplier;
  };

  // Get rotation for medal (random 0-3 degrees)
  const medalSeed = getIdSeed(entry.id, 2);
  const medalRandom = ((medalSeed * 9301 + 49297) % 233280) / 233280;
  const medalRotation = medalRandom * 3; // 0 to 3 degrees

  // Get rotation for finisher photo (random 0-3 degrees)
  const finisherSeed = getIdSeed(entry.id, 3);
  const finisherRandom = ((finisherSeed * 9301 + 49297) % 233280) / 233280;
  const finisherRotation = finisherRandom * 3; // 0 to 3 degrees

  // Corner position styles - at edges with slight overflow
  const getCornerStyle = (corner) => {
    const styles = {
      'top-left': { top: '-5%', left: '-8%' },
      'top-right': { top: '-5%', right: '-8%' },
      'bottom-left': { bottom: '-5%', left: '-8%' },
      'bottom-right': { bottom: '-5%', right: '-8%' },
    };
    return styles[corner] || styles['top-left'];
  };

  return (
    <div
      onClick={() => onViewRace(entry.id)}
      className="flex flex-col items-center cursor-pointer group overflow-visible"
    >
      {bibImageSrc ? (
        <div 
          className="w-full mb-3 relative transition-transform duration-300 ease-out overflow-visible"
          style={{ 
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center',
            filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = `rotate(0deg) scale(1.05)`;
            // Add independent rotation animations to medal and finisher
            if (medalRef.current) {
              const additionalMedalRotation = -medalRotation + (medalRotation > 0 ? -3 : 3);
              medalRef.current.style.transform = `rotate(${additionalMedalRotation}deg) scale(1.1)`;
            }
            if (finisherRef.current) {
              const additionalFinisherRotation = -finisherRotation + (finisherRotation > 0 ? 4 : -4);
              finisherRef.current.style.transform = `rotate(${additionalFinisherRotation}deg) scale(1.1)`;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = `rotate(${rotation}deg) scale(1)`;
            // Reset medal and finisher rotations
            if (medalRef.current) {
              medalRef.current.style.transform = `rotate(${medalRotation}deg) scale(1)`;
            }
            if (finisherRef.current) {
              finisherRef.current.style.transform = `rotate(${finisherRotation}deg) scale(1)`;
            }
          }}
        >
          <img
            src={bibImageSrc}
            alt={`Bib for ${entry.raceName}`}
            className="w-full h-auto object-contain rounded-lg"
            loading="lazy"
          />
          
          {/* Medal cutout overlay (background removed) */}
          {medalImageSrc && (
            <div
              ref={medalRef}
              className="absolute pointer-events-none z-10 transition-transform duration-300 ease-out"
              style={{
                ...getCornerStyle(corners.medal),
                transform: `rotate(${medalRotation}deg)`,
                transformOrigin: 'center',
                height: '100%',
                width: 'auto',
                maxWidth: '160px',
                filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.3)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2))',
              }}
            >
              <img
                src={medalImageSrc}
                alt={`Medal for ${entry.raceName}`}
                className="h-full w-auto object-contain rounded-lg"
                loading="lazy"
                style={{
                  display: 'block',
                }}
              />
            </div>
          )}

          {/* Finisher photo polaroid overlay */}
          {finisherImageSrc && (
            <div
              ref={finisherRef}
              className="absolute pointer-events-none z-10 transition-transform duration-300 ease-out"
              style={{
                ...getCornerStyle(corners.finisher),
                transform: `rotate(${finisherRotation}deg)`,
                transformOrigin: 'center',
                width: '28%',
                maxWidth: '160px',
                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15))',
              }}
            >
              {/* Polaroid frame - white border with bottom margin */}
              <div 
                className="bg-white"
                style={{ 
                  padding: '6px 6px 18px 6px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
                }}
              >
                <img
                  src={finisherImageSrc}
                  alt={`Finisher photo for ${entry.raceName}`}
                  className="w-full h-auto object-cover"
                  loading="lazy"
                  style={{ display: 'block' }}
                />
              </div>
            </div>
          )}
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
}
