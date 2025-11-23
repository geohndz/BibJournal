import { useState, useEffect } from 'react';
import { useRaceEntries } from '../hooks/useRaceEntries';
import { ImageToggle } from './ImageToggle';
import { RouteVisualization } from './RouteVisualization';
import { formatDate } from '../lib/dateUtils';

/**
 * Race detail view component
 */
export function RaceDetail({ entryId, onClose, onEdit }) {
  const { getEntry, deleteEntry } = useRaceEntries();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadEntry();
  }, [entryId]);


  const loadEntry = async () => {
    try {
      const data = await getEntry(entryId);
      setEntry(data);
      setLoading(false);
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
      await deleteEntry(entryId);
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
    <div className="fixed inset-0 overflow-y-auto z-50">
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
              <button
                onClick={() => onEdit(entry.id)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-12">
          {/* Race Information - Moved to top, left-aligned */}
          <section className="flex flex-col items-start text-left">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">{entry.raceName}</h1>
            <div className="flex flex-wrap items-center gap-4 text-gray-600">
              <span>{entry.raceType}</span>
              <span>•</span>
              <span>{entry.location}</span>
              <span>•</span>
              <span>{entry.date && formatDate(entry.date, 'MMMM d, yyyy')}</span>
            </div>
          </section>

          {/* Race Bib and Medal together - top aligned */}
          <section className="flex flex-col md:flex-row gap-6 items-start">
            {/* Bib on the left */}
            {entry.bibPhoto && (
              <div className="flex-1 max-w-2xl">
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
                        <ImageToggle
                          original={entry.medalPhoto.original}
                          cropped={entry.medalPhoto.cropped}
                          useCropped={entry.medalPhoto.useCropped}
                          processed={entry.medalPhoto.processed}
                          useProcessed={entry.medalPhoto.useProcessed}
                          alt={`Medal for ${entry.raceName}`}
                          showToggle={false}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Race Results */}
          {entry.results && (
            (entry.results.finishTime || entry.results.overallPlace || 
             entry.results.ageGroupPlace || entry.results.division) && (
              <section className="flex flex-col items-center text-center">
                <dl className="max-w-2xl w-full grid grid-cols-2 md:grid-cols-4 gap-4">
                  {entry.results.finishTime && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 uppercase tracking-wide">Finish Time</dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">{entry.results.finishTime}</dd>
                    </div>
                  )}
                  {entry.results.overallPlace && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 uppercase tracking-wide">Overall Place</dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">{entry.results.overallPlace}</dd>
                    </div>
                  )}
                  {entry.results.ageGroupPlace && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 uppercase tracking-wide">Age Group Place</dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">{entry.results.ageGroupPlace}</dd>
                    </div>
                  )}
                  {entry.results.division && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 uppercase tracking-wide">Division</dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">{entry.results.division}</dd>
                    </div>
                  )}
                </dl>
              </section>
            )
          )}

          {/* Route Visualization with Finisher Photo and Notes */}
          {entry.routeData && (
            <section className={`flex flex-col ${entry.finisherPhoto || entry.notes ? 'md:flex-row' : ''} gap-6 items-start`}>
              {/* Finisher Photo and Notes on the left */}
              {(entry.finisherPhoto || entry.notes) && (
                <div className="w-full md:w-80 flex-shrink-0 flex flex-col gap-6">
                  {entry.finisherPhoto && (
                    <img
                      src={entry.finisherPhoto}
                      alt={`Finisher photo for ${entry.raceName}`}
                      className="w-full h-auto object-contain rounded-lg"
                    />
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
    </div>
  );
}
