import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

// Admin emails - in a real app, this would be in a secure environment variable or database
const ADMIN_EMAILS = ['admin@demo.com'];

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initializeAuth() {
      try {
        setLoading(true);
        // Get initial session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            role: session.user.user_metadata.role || 'user'
          });
          setIsAdmin(ADMIN_EMAILS.includes(session.user.email!));
        } else {
          setUser(null);
          setIsAdmin(false);
        }
      } catch (err) {
        console.error('Auth error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setUser(null);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        setLoading(true);
        
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            role: session.user.user_metadata.role || 'user'
          });
          setIsAdmin(ADMIN_EMAILS.includes(session.user.email!));
        } else {
          setUser(null);
          setIsAdmin(false);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setUser(null);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading, isAdmin, error };
}
