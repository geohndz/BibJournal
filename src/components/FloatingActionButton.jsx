import { Bug } from 'lucide-react';

/**
 * Floating action button for feedback form
 */
export function FloatingActionButton({ showTooltip = false }) {
  return (
    <div className="fixed bottom-6 right-6 z-20">
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 whitespace-nowrap">
          <div className="bg-gray-900 text-white text-sm font-medium px-3 py-2 rounded-lg shadow-lg relative">
            Suggestions/Report a bug
            {/* Arrow pointing right */}
            <div className="absolute left-full top-1/2 transform -translate-y-1/2">
              <div className="border-4 border-transparent border-l-gray-900"></div>
            </div>
          </div>
        </div>
      )}
      <a
        href="https://forms.gle/6Pvsi1BZCJDQfwQRA"
        target="_blank"
        rel="noopener noreferrer"
        className="w-14 h-14 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
        aria-label="Provide feedback"
      >
        <Bug className="w-6 h-6" />
      </a>
    </div>
  );
}
