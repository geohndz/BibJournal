import { LayoutGrid, List, Columns } from 'lucide-react';

/**
 * Component for toggling between different view modes
 */
export function ViewToggle({ viewMode, onViewModeChange, VIEW_MODES }) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
      <button
        onClick={() => onViewModeChange(VIEW_MODES.GRID)}
        className={`p-2 rounded transition-colors relative group ${
          viewMode === VIEW_MODES.GRID
            ? 'bg-white text-primary-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <LayoutGrid className="w-5 h-5" />
        {/* Tooltip */}
        <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap" style={{ zIndex: 1000 }}>
          Grid view
        </span>
      </button>
      <button
        onClick={() => onViewModeChange(VIEW_MODES.LIST)}
        className={`p-2 rounded transition-colors relative group ${
          viewMode === VIEW_MODES.LIST
            ? 'bg-white text-primary-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <List className="w-5 h-5" />
        {/* Tooltip */}
        <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap" style={{ zIndex: 1000 }}>
          List view
        </span>
      </button>
      <button
        onClick={() => onViewModeChange(VIEW_MODES.COLUMN)}
        className={`p-2 rounded transition-colors relative group ${
          viewMode === VIEW_MODES.COLUMN
            ? 'bg-white text-primary-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <Columns className="w-5 h-5" />
        {/* Tooltip */}
        <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap" style={{ zIndex: 1000 }}>
          Column view
        </span>
      </button>
    </div>
  );
}
