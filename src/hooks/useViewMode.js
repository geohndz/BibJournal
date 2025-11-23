import { useState, useEffect } from 'react';

const VIEW_MODES = {
  GRID: 'grid',
  LIST: 'list',
  COLUMN: 'column',
};

/**
 * Custom hook for managing view mode preference
 */
export function useViewMode() {
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem('bib-journal-view-mode');
    return saved || VIEW_MODES.GRID;
  });

  useEffect(() => {
    localStorage.setItem('bib-journal-view-mode', viewMode);
  }, [viewMode]);

  return {
    viewMode,
    setViewMode,
    VIEW_MODES,
  };
}
