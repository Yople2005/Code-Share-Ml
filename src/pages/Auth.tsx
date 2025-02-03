import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface AuthProps {
  setIsGuest?: (isGuest: boolean) => void;
}

export function Auth({ setIsGuest }: AuthProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  React.useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('Checking session in Auth...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (session) {
          console.log('Session found, redirecting to home');
          navigate('/');
        }
      } catch (err) {
        console.error('Session check error:', err);
        setError(err instanceof Error ? err.message : 'Failed to check session');
      }
    };

    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log('Attempting login...');
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: `${email}@demo.com`,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      console.log('Login successful');
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-purple-100">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg transform hover:scale-105 transition-transform">
                <div className="p-2 bg-white rounded-xl">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-3xl sm:text-4xl font-mono bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {`</>`}
                  </div>
                </div>
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Code Share ML
            </h1>
            <h2 className="text-lg sm:text-xl font-medium text-gray-700 mb-1">
              Welcome Back
            </h2>
            <p className="text-sm text-gray-500">
              Join our community of students and get your code snippets with the friends for exam
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-5">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 p-4 border border-red-100">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <LoadingSpinner size="sm" color="white" />
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <div className="text-sm text-gray-500">
              Need help with your account?
            </div>
            <a 
              href="https://t.me/yople_so_tr_ngr_pl" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="mt-2 inline-flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.548.223l.188-2.623 4.823-4.35c.192-.18-.043-.277-.297-.098L9.652 14.3l-2.573-.802c-.663-.204-.663-.663.137-.984l10.102-3.916c.548-.203 1.033.126.576 1.623z"/>
              </svg>
              Contact Tay Zar Min Htay on Telegram
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}