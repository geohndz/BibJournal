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
    <div className="fixed inset-0 bg-gray-50 overflow-y-auto z-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
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
          {/* Race Bib */}
          {entry.bibPhoto && (
            <section className="flex flex-col items-center">
              <div className="max-w-2xl w-full">
                <ImageToggle
                  original={entry.bibPhoto.original}
                  cropped={entry.bibPhoto.cropped}
                  useCropped={entry.bibPhoto.useCropped}
                  processed={entry.bibPhoto.processed}
                  useProcessed={entry.bibPhoto.useProcessed}
                  alt={`Bib for ${entry.raceName}`}
                />
              </div>
            </section>
          )}

          {/* Race Information */}
          <section className="flex flex-col items-center text-center">
            <dl className="max-w-2xl w-full space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500 uppercase tracking-wide">Race Name</dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900">{entry.raceName}</dd>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 text-gray-600">
                <span>{entry.raceType}</span>
                <span>•</span>
                <span>{entry.location}</span>
                <span>•</span>
                <span>{entry.date && formatDate(entry.date, 'MMMM d, yyyy')}</span>
              </div>
            </dl>
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

          {/* Finisher Photo */}
          {entry.finisherPhoto && (
            <section className="flex flex-col items-center">
              <img
                src={entry.finisherPhoto}
                alt={`Finisher photo for ${entry.raceName}`}
                className="w-full h-auto max-w-2xl mx-auto"
              />
            </section>
          )}

          {/* Medal Photo */}
          {entry.medalPhoto && (
            <section className="flex flex-col items-center">
              <div className="max-w-md w-full">
                <ImageToggle
                  original={entry.medalPhoto.original}
                  cropped={entry.medalPhoto.cropped}
                  useCropped={entry.medalPhoto.useCropped}
                  processed={entry.medalPhoto.processed}
                  useProcessed={entry.medalPhoto.useProcessed}
                  alt={`Medal for ${entry.raceName}`}
                />
              </div>
            </section>
          )}

          {/* Route Visualization */}
          {entry.routeData && (
            <section className="flex flex-col items-center">
              <div className="w-full max-w-5xl">
                <RouteVisualization routeData={entry.routeData} />
              </div>
            </section>
          )}

          {/* Notes */}
          {entry.notes && (
            <section className="flex flex-col items-center text-center">
              <div className="max-w-2xl w-full">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{entry.notes}</p>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
