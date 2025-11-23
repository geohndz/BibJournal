import { useRaceEntries } from '../hooks/useRaceEntries';
import { useViewMode } from '../hooks/useViewMode';
import { EmptyState } from './EmptyState';
import { ViewToggle } from './ViewToggle';
import { FloatingActionButton } from './FloatingActionButton';
import { formatDate } from '../lib/dateUtils';
import logoSvg from '../assets/Bib Journal.svg';

/**
 * Home screen component displaying all race entries
 */
export function Home({ onAddRace, onViewRace }) {
  const { entries, loading } = useRaceEntries();
  const { viewMode, setViewMode, VIEW_MODES } = useViewMode();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (entries.length === 0) {
    return <EmptyState onAddRace={onAddRace} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <img 
                src={logoSvg} 
                alt="Bib Journal" 
                className="h-10 w-auto"
              />
            </div>
            <div className="flex items-center gap-4">
              <ViewToggle
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                VIEW_MODES={VIEW_MODES}
              />
              <button
                onClick={onAddRace}
                className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Race
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        {viewMode === VIEW_MODES.GRID && (
          <GridView entries={entries} onViewRace={onViewRace} />
        )}
        {viewMode === VIEW_MODES.LIST && (
          <ListView entries={entries} onViewRace={onViewRace} />
        )}
        {viewMode === VIEW_MODES.COLUMN && (
          <ColumnView entries={entries} onViewRace={onViewRace} />
        )}
      </main>

      {/* Floating Action Button */}
      <FloatingActionButton onClick={onAddRace} />
    </div>
  );
}

/**
 * Grid view component (masonry-style)
 */
function GridView({ entries, onViewRace }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-visible">
      {entries.map((entry) => (
        <RaceCard key={entry.id} entry={entry} onViewRace={onViewRace} />
      ))}
    </div>
  );
}

/**
 * List view component
 */
function ListView({ entries, onViewRace }) {
  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div
          key={entry.id}
          onClick={() => onViewRace(entry.id)}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer flex items-center gap-4"
        >
          {entry.bibPhoto && (
            <img
              src={
                entry.bibPhoto.cropped
                  ? (entry.bibPhoto.useCropped !== false ? entry.bibPhoto.cropped : entry.bibPhoto.original)
                  : (entry.bibPhoto.processed 
                      ? (entry.bibPhoto.useProcessed !== false ? entry.bibPhoto.processed : entry.bibPhoto.original)
                      : entry.bibPhoto.original)
              }
              alt={`Bib for ${entry.raceName}`}
              className="w-24 h-24 object-contain rounded bg-gray-50 flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {entry.raceName}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {entry.raceType} • {entry.location}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {entry.date && formatDate(entry.date, 'MMM d, yyyy')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Column view component
 */
function ColumnView({ entries, onViewRace }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {entries.map((entry) => (
        <div
          key={entry.id}
          onClick={() => onViewRace(entry.id)}
          className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
        >
          {entry.bibPhoto && (
            <div className="aspect-video bg-gray-100 flex items-center justify-center">
              <img
                src={
                  entry.bibPhoto.cropped
                    ? (entry.bibPhoto.useCropped !== false ? entry.bibPhoto.cropped : entry.bibPhoto.original)
                    : (entry.bibPhoto.processed 
                        ? (entry.bibPhoto.useProcessed !== false ? entry.bibPhoto.processed : entry.bibPhoto.original)
                        : entry.bibPhoto.original)
                }
                alt={`Bib for ${entry.raceName}`}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
          <div className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {entry.raceName}
            </h3>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
              <span>{entry.raceType}</span>
              <span>•</span>
              <span>{entry.location}</span>
              <span>•</span>
              <span>{entry.date && formatDate(entry.date, 'MMM d, yyyy')}</span>
            </div>
            {entry.results?.finishTime && (
              <div className="text-sm text-gray-700">
                Finish Time: {entry.results.finishTime}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Generate a consistent random rotation based on entry ID
 * Returns a value between -3 and 3 degrees
 */
function getRotationForEntry(entryId) {
  // Use entry ID as seed for consistent rotation
  const seed = entryId * 12345;
  const random = ((seed * 9301 + 49297) % 233280) / 233280;
  // Return rotation between -3 and 3 degrees
  return (random * 6) - 3;
}

/**
 * Generate consistent corner positions based on entry ID
 * Returns positions for medal and finisher photo on opposite corners
 */
function getCornerPositions(entryId) {
  const seed = entryId * 54321;
  const random = ((seed * 10973 + 571) % 233280) / 233280;
  
  // Define corner pairs (opposite corners)
  const cornerPairs = [
    { medal: 'top-left', finisher: 'bottom-right' },
    { medal: 'top-right', finisher: 'bottom-left' },
    { medal: 'bottom-left', finisher: 'top-right' },
    { medal: 'bottom-right', finisher: 'top-left' },
  ];
  
  // Select a random pair based on seed
  const pairIndex = Math.floor(random * cornerPairs.length);
  return cornerPairs[pairIndex];
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

  // Medal with background removed (processed version for cutout effect)
  const medalImageSrc = entry.medalPhoto
    ? (entry.medalPhoto.processed
        ? (entry.medalPhoto.useProcessed !== false ? entry.medalPhoto.processed : entry.medalPhoto.original)
        : entry.medalPhoto.original)
    : null;

  const finisherImageSrc = entry.finisherPhoto;

  // Get consistent rotation and corner positions for this entry
  const rotation = getRotationForEntry(entry.id);
  const corners = getCornerPositions(entry.id);

  // Get rotation for medal (random 0-3 degrees)
  const medalSeed = entry.id * 2;
  const medalRandom = ((medalSeed * 9301 + 49297) % 233280) / 233280;
  const medalRotation = medalRandom * 3; // 0 to 3 degrees

  // Get rotation for finisher photo (random 0-3 degrees)
  const finisherSeed = entry.id * 3;
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
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = `rotate(${rotation}deg) scale(1)`;
          }}
        >
          <img
            src={bibImageSrc}
            alt={`Bib for ${entry.raceName}`}
            className="w-full h-auto object-contain"
          />
          
          {/* Medal cutout overlay (background removed) */}
          {medalImageSrc && (
            <div
              className="absolute pointer-events-none z-10"
              style={{
                ...getCornerStyle(corners.medal),
                transform: `rotate(${medalRotation}deg)`,
                transformOrigin: 'center',
                width: '45%',
                maxWidth: '240px',
                filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.3)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2))',
              }}
            >
              <img
                src={medalImageSrc}
                alt={`Medal for ${entry.raceName}`}
                className="w-full h-auto object-contain"
                style={{
                  display: 'block',
                }}
              />
            </div>
          )}

          {/* Finisher photo polaroid overlay */}
          {finisherImageSrc && (
            <div
              className="absolute pointer-events-none z-10"
              style={{
                ...getCornerStyle(corners.finisher),
                transform: `rotate(${finisherRotation}deg)`,
                transformOrigin: 'center',
                width: '28%',
                maxWidth: '160px',
                filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.25))',
              }}
            >
              {/* Polaroid frame - white border with bottom margin */}
              <div 
                className="bg-white shadow-lg"
                style={{ 
                  padding: '6px 6px 18px 6px',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                }}
              >
                <img
                  src={finisherImageSrc}
                  alt={`Finisher photo for ${entry.raceName}`}
                  className="w-full h-auto object-cover"
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
        <h3 className="font-semibold text-gray-900 mb-1">
          {entry.raceName}
        </h3>
        <p className="text-sm text-gray-500 mb-1">
          {entry.raceType}
        </p>
        <p className="text-xs text-gray-400">
          {entry.date && formatDate(entry.date, 'MMM d, yyyy')}
        </p>
      </div>
    </div>
  );
}
