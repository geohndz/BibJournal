import { useState, useEffect, useRef } from 'react';
import { useRaceEntries } from '../hooks/useRaceEntries';
import { ImageToggle } from './ImageToggle';
import { RouteVisualization } from './RouteVisualization';
import { formatDate } from '../lib/dateUtils';
import { getRaceTypeDisplay, getRaceTypeForFilter } from '../lib/raceUtils';
import { trackRaceViewed, trackRaceDeleted } from '../lib/analytics';
import { Medal, Clock, Trophy, UserRound, Users, MoreVertical, Pencil, Trash2, Maximize2, X } from 'lucide-react';

/**
 * Race detail view component
 */
export function RaceDetail({ entryId, onClose, onEdit, onDelete }) {
  const { getEntry, deleteEntry } = useRaceEntries();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showFinisherModal, setShowFinisherModal] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    loadEntry();
  }, [entryId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  const loadEntry = async () => {
    try {
      const data = await getEntry(entryId);
      setEntry(data);
      setLoading(false);
      
      // Track race viewed
      if (data && data.raceType) {
        trackRaceViewed(data.raceType);
      }
    } catch (error) {
      console.error('Failed to load entry:', error);
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this race entry? This cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      // Track race deleted before deleting
      if (entry) {
        trackRaceDeleted(getRaceTypeForFilter(entry));
      }
      
      await deleteEntry(entryId);
      
      // Notify parent to refresh entries
      if (onDelete) {
        onDelete();
      }
      
      // Wait a bit longer for entries to refresh and propagate
      await new Promise(resolve => setTimeout(resolve, 500));
      onClose();
    } catch (error) {
      console.error('Failed to delete entry:', error);
      alert('Failed to delete entry. Please try again.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex items-center justify-center z-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex items-center justify-center z-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Race entry not found</p>
          <button
            onClick={onClose}
            className="text-primary-600 hover:text-primary-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-y-auto z-50 bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <div className="flex items-center gap-3">
              {/* Dropdown Menu */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="More options"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onEdit(entry.id);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        handleDelete();
                      }}
                      disabled={deleting}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content - Centered vertically */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-73px)] flex items-center">
        <div className="w-full space-y-12">
          {/* Race Information - Title and Location - Centered */}
          <section className="flex flex-col items-center text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-4 flex items-center gap-3 justify-center">
              {entry.raceName}
              {entry.isPersonalBest && (
                <Medal className="w-8 h-8 text-yellow-500 flex-shrink-0" />
              )}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mb-6 justify-center">
              {/* Distance pill - show if we have raceDistance, or if old format with just raceType */}
              {entry.raceDistance ? (
                <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                  {entry.raceDistance}
                </span>
              ) : entry.raceType && !entry.raceDistance ? (
                // Old format: show the raceType as a single pill
                <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                  {entry.raceType}
                </span>
              ) : null}
              {/* Type pill - only show if we have the new format with separate type */}
              {entry.raceType && entry.raceDistance && (
                <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                  {entry.raceType}
                </span>
              )}
              {entry.location && (
                <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                  {entry.location}
                </span>
              )}
              {entry.date && (
                <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                  {formatDate(entry.date, 'MMMM d, yyyy')}
                </span>
              )}
            </div>
            
            {/* Race Results - Sticky note style cards */}
            {entry.results && (
              (entry.results.finishTime || entry.results.overallPlace || 
               entry.results.ageGroupPlace || entry.results.division) && (
                <div className="flex flex-wrap gap-4 justify-center mt-6">
                  {/* Finish Time - Blue */}
                  {entry.results.finishTime && (
                    <div className="bg-blue-200/70 rounded-lg p-4 shadow-sm transform rotate-[-2deg] hover:rotate-0 transition-transform">
                      <div className="flex items-center gap-2 text-blue-700 mb-2">
                        <Clock className="w-4 h-4" />
                        <div className="text-xs font-medium uppercase tracking-wide">Finish Time</div>
                      </div>
                      <div className="font-bold text-2xl text-gray-900">
                        {entry.results.finishTime}
                      </div>
                    </div>
                  )}
                  
                  {/* Overall Place - Green */}
                  {entry.results.overallPlace && (
                    <div className="bg-green-200/70 rounded-lg p-4 shadow-sm transform rotate-[2deg] hover:rotate-0 transition-transform">
                      <div className="flex items-center justify-center gap-2 text-green-700 mb-2">
                        <Trophy className="w-4 h-4" />
                        <div className="text-xs font-medium uppercase tracking-wide">Overall Place</div>
                      </div>
                      <div className="flex items-baseline justify-center gap-2">
                        <div className="font-bold text-2xl text-gray-900">
                          {entry.results.overallPlace}
                        </div>
                        {entry.results.overallParticipants && (
                          <div className="text-sm text-green-700">
                            of {entry.results.overallParticipants}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Age Group Place - Yellow */}
                  {entry.results.ageGroupPlace && (
                    <div className="bg-yellow-200/70 rounded-lg p-4 shadow-sm transform rotate-[-1.5deg] hover:rotate-0 transition-transform">
                      <div className="flex items-center justify-center gap-2 text-yellow-700 mb-2">
                        <Users className="w-4 h-4" />
                        <div className="text-xs font-medium uppercase tracking-wide">Age Group Place</div>
                      </div>
                      <div className="flex items-baseline justify-center gap-2">
                        <div className="font-bold text-2xl text-gray-900">
                          {entry.results.ageGroupPlace}
                        </div>
                        {entry.results.ageGroupParticipants && (
                          <div className="text-sm text-yellow-700">
                            of {entry.results.ageGroupParticipants}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Division - Pink */}
                  {entry.results.division && (
                    <div className="bg-pink-200/70 rounded-lg p-4 shadow-sm transform rotate-[1.5deg] hover:rotate-0 transition-transform">
                      <div className="flex items-center gap-2 text-pink-700 mb-2">
                        <UserRound className="w-4 h-4" />
                        <div className="text-xs font-medium uppercase tracking-wide">Division</div>
                      </div>
                      <div className="font-bold text-2xl text-gray-900">
                        {entry.results.division}
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </section>

          {/* Race Bib and Medal together - top aligned */}
          <section className="flex flex-col md:flex-row gap-6 items-start">
            {/* Bib on the left */}
            {entry.bibPhoto && (
              <div className={entry.medalPhoto ? "flex-1 max-w-2xl" : "w-full"}>
                <ImageToggle
                  original={entry.bibPhoto.original}
                  cropped={entry.bibPhoto.cropped}
                  useCropped={entry.bibPhoto.useCropped}
                  processed={entry.bibPhoto.processed}
                  useProcessed={entry.bibPhoto.useProcessed}
                  alt={`Bib for ${entry.raceName}`}
                />
              </div>
            )}

            {/* Medal Photo on the right - taller case */}
            {entry.medalPhoto && (
              <div className="w-full md:w-80 overflow-hidden flex">
                {/* Medal case frame - taller than square */}
                <div className="relative w-full aspect-[4/5] flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border-4 border-gray-300 overflow-hidden">
                  {/* Glare effect - sweeps across every 10 seconds */}
                  <div 
                    className="absolute inset-0 z-20 pointer-events-none"
                    style={{
                      background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)',
                      animation: 'glare 10s infinite',
                      transform: 'translateX(-100%) skewX(-20deg)',
                    }}
                  ></div>
                  {/* Inner padding/glass effect */}
                  <div className="w-full h-full p-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 100%)' }}>
                    {/* Medal image - larger size */}
                    <div className="relative z-10 w-full h-full flex items-center justify-center">
                      <div className="w-full h-full max-w-none max-h-full" style={{ transform: 'scale(1.8)' }}>
                        <img
                          src={typeof entry.medalPhoto === 'string' ? entry.medalPhoto : (entry.medalPhoto?.processed || entry.medalPhoto?.original)}
                          alt={`Medal for ${entry.raceName}`}
                          className="w-full h-auto rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>


          {/* Route Visualization with Finisher Photo and Notes */}
          {entry.routeData && (
            <section className={`flex flex-col ${entry.finisherPhoto || entry.notes ? 'md:flex-row' : ''} gap-6 items-start`}>
              {/* Finisher Photo and Notes on the left */}
              {(entry.finisherPhoto || entry.notes) && (
                <div className="w-full md:w-80 flex-shrink-0 flex flex-col gap-6">
                  {entry.finisherPhoto && (
                    <div className="relative group">
                      <img
                        src={entry.finisherPhoto}
                        alt={`Finisher photo for ${entry.raceName}`}
                        className="w-full h-auto object-contain rounded-lg"
                      />
                      <button
                        onClick={() => setShowFinisherModal(true)}
                        className="absolute top-2 right-2 p-2 bg-black/70 hover:bg-black/90 text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        aria-label="Expand finisher photo"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {entry.notes && (
                    <div className="w-full">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-left">{entry.notes}</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Map on the right (or full width if no finisher photo or notes) */}
                  <div className={`${(entry.finisherPhoto || entry.notes) ? 'flex-1' : 'w-full'} max-w-5xl ${(entry.finisherPhoto || entry.notes) ? '' : 'mx-auto'}`}>
                    <RouteVisualization routeData={entry.routeData} />
                  </div>
            </section>
          )}

              {/* Route Visualization without Finisher Photo or Notes */}
              {entry.routeData && !entry.finisherPhoto && !entry.notes && (
                <section className="flex flex-col items-center">
                  <div className="w-full max-w-5xl">
                    <RouteVisualization routeData={entry.routeData} />
                  </div>
                </section>
              )}

          {/* Notes without Route Data */}
          {entry.notes && !entry.routeData && (
            <section className="flex flex-col items-start">
              <div className="max-w-2xl w-full">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-left">{entry.notes}</p>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Finisher Photo Modal */}
      {showFinisherModal && entry.finisherPhoto && (
        <div 
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
          onClick={() => setShowFinisherModal(false)}
        >
          <button
            onClick={() => setShowFinisherModal(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={entry.finisherPhoto}
            alt={`Finisher photo for ${entry.raceName}`}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
