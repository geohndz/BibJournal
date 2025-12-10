import { useState, useRef, useEffect, useMemo } from 'react';
import { LogOut } from 'lucide-react';
import { FloatingActionButton } from './FloatingActionButton';
import logoSvg from '../assets/Bib Journal.svg';

/**
 * Empty state component shown when no race entries exist
 */
export function EmptyState({ onAddRace, currentUser, onLogout }) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  
  // Generate random 4-digit numbers for each bib (only once)
  const bibNumbers = useMemo(() => [
    Math.floor(1000 + Math.random() * 9000),
    Math.floor(1000 + Math.random() * 9000),
    Math.floor(1000 + Math.random() * 9000),
  ], []);

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

      {/* Empty State Content - Centered */}
      <div className="min-h-[calc(100vh-73px)] flex flex-col items-center justify-center px-4 text-center">
        {/* Fake Bibs - Grouped in middle with pop-out animation */}
        <div className="relative mb-8" style={{ width: '300px', height: '300px' }}>
          {/* Bib 1 - Blue */}
          <div 
            className="absolute bg-blue-200 rounded-lg shadow-sm animate-pop-out-1"
            style={{
              width: '180px',
              height: '135px',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-3deg)',
              transformOrigin: 'center',
            }}
          >
            {/* Corner dots - all off-white background */}
            <div className="absolute top-2 left-2 w-2 h-2 rounded-full" style={{ backgroundColor: '#f9fafb' }}></div>
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ backgroundColor: '#f9fafb' }}></div>
            <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full" style={{ backgroundColor: '#f9fafb' }}></div>
            <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full" style={{ backgroundColor: '#f9fafb' }}></div>
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-5xl font-bold text-blue-700">{bibNumbers[0]}</div>
            </div>
          </div>
          
          {/* Bib 2 - Green */}
          <div 
            className="absolute bg-green-200 rounded-lg shadow-sm animate-pop-out-2"
            style={{
              width: '180px',
              height: '135px',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(2deg)',
              transformOrigin: 'center',
            }}
          >
            {/* Corner dots - bottom left blue, others off-white background */}
            <div className="absolute top-2 left-2 w-2 h-2 rounded-full" style={{ backgroundColor: '#f9fafb' }}></div>
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ backgroundColor: '#f9fafb' }}></div>
            <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-blue-200"></div>
            <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full" style={{ backgroundColor: '#f9fafb' }}></div>
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-5xl font-bold text-green-700">{bibNumbers[1]}</div>
            </div>
          </div>
          
          {/* Bib 3 - Yellow */}
          <div 
            className="absolute bg-yellow-200 rounded-lg shadow-sm animate-pop-out-3"
            style={{
              width: '180px',
              height: '135px',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-1deg)',
              transformOrigin: 'center',
            }}
          >
            {/* Corner dots - top left blue, others off-white background */}
            <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-blue-200"></div>
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ backgroundColor: '#f9fafb' }}></div>
            <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full" style={{ backgroundColor: '#f9fafb' }}></div>
            <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full" style={{ backgroundColor: '#f9fafb' }}></div>
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-5xl font-bold text-yellow-700">{bibNumbers[2]}</div>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          No races yet
        </h2>
        <p className="text-gray-500 mb-8 max-w-md">
          Start documenting your racing achievements! Add your first race to begin building your digital scrapbook.
        </p>
        <button
          onClick={onAddRace}
          className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-6 py-3 rounded-lg transition-colors inline-flex items-center gap-2"
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
          Add Your First Race
        </button>
      </div>


      {/* Floating Action Button */}
      <FloatingActionButton />
    </div>
  );
}
