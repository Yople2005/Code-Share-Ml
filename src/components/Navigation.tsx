import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from './LoadingSpinner';
import { useAuth } from '../hooks/useAuth';

export function Navigation() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const profileMenuRef = React.useRef<HTMLDivElement>(null);

  // Handle clicks outside of profile menu
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showProfileMenu]);

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
      setShowProfileMenu(false);
    }
  };

  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  return (
    <nav className="bg-white border-b-2 border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link 
              to="/" 
              className="flex items-center space-x-2 text-lg sm:text-xl font-bold hover:opacity-80 transition-opacity"
            >
              <div className="p-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-sm transform hover:scale-105 transition-transform">
                <div className="p-0.5 bg-white rounded-md">
                  <div className="w-6.5 h-6.5 flex items-center justify-center text-base font-mono bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {`</>`}
                  </div>
                </div>
              </div>
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Codes Share Ml
              </span>
            </Link>
          </div>

          {user && (
            <div className="flex items-center" ref={profileMenuRef}>
              <div className="relative">
                <button
                  onClick={toggleProfileMenu}
                  className="flex items-center space-x-2 sm:space-x-3 p-2 rounded-xl hover:bg-gray-100 transition-colors relative z-10"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white font-medium">
                    {user.email[0].toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-gray-700">
                      {user.email.split('@')[0]}
                    </div>
                    <div className="text-xs">
                      {isAdmin ? (
                        <span className="text-indigo-600 font-medium">Admin</span>
                      ) : (
                        <span className="text-purple-600 font-medium">User</span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Dropdown menu - make it full width on mobile */}
                {showProfileMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 sm:w-56 rounded-xl bg-white shadow-lg border-2 border-gray-100 overflow-hidden z-30">
                    {/* User info - visible on mobile */}
                    <div className="sm:hidden p-4 border-b-2 border-gray-100">
                      <div className="text-sm font-medium text-gray-900">
                        {user.email.split('@')[0]}
                      </div>
                      <div className="text-xs mt-0.5">
                        {isAdmin ? (
                          <span className="text-indigo-600 font-medium">Admin</span>
                        ) : (
                          <span className="text-purple-600 font-medium">User</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Sign out button */}
                    <div className="p-2">
                      <button
                        onClick={handleSignOut}
                        disabled={loading}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center space-x-2"
                      >
                        {loading ? (
                          <>
                            <LoadingSpinner size="sm" />
                            <span>Signing out...</span>
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>Sign out</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}