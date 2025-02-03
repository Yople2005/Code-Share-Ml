import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import Home from './pages/Home';
import { Auth } from './pages/Auth';
import { supabase } from './lib/supabase';
import { LoadingSpinner } from './components/LoadingSpinner';
import './styles/code.css';

export function App() {
  const [session, setSession] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function initializeAuth() {
      try {
        console.log('Checking session...');
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        console.log('Session data:', data);
        setSession(data.session);
        
        const { data: { subscription }, error: subscriptionError } = supabase.auth.onAuthStateChange((_event, session) => {
          console.log('Auth state changed:', session);
          setSession(session);
        });

        if (subscriptionError) {
          throw subscriptionError;
        }

        return () => subscription.unsubscribe();
      } catch (err) {
        console.error('Auth error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    initializeAuth();
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {session && <Navigation />}
        <Routes>
          <Route 
            path="/auth" 
            element={
              !session ? (
                <div className="container mx-auto px-4 py-8">
                  <Auth />
                </div>
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          <Route 
            path="/" 
            element={
              session ? (
                <div className="container mx-auto px-4 py-8">
                  <Home />
                </div>
              ) : (
                <Navigate to="/auth" replace />
              )
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}