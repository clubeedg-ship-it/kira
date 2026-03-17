import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { api } from '../lib/api';

type Organization = {
  id: string;
  name: string;
  slug: string;
};

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // MVP: look up user by setting header, fetch their org
      // This will be replaced by proper auth flow
      const tempUserId = email; // For dev: pass user ID directly
      localStorage.setItem('userId', tempUserId);

      // Try to fetch user's orgs via health check pattern
      // For now, we need the orgId too
      const orgSlug = document.querySelector<HTMLInputElement>('#orgSlug')?.value;
      if (!orgSlug) {
        setError('Organization slug is required');
        setLoading(false);
        return;
      }

      // Verify access works
      const res = await fetch(`/orgs/${orgSlug}`, {
        headers: { 'X-User-Id': tempUserId },
      });

      if (!res.ok) {
        setError('Invalid credentials or organization');
        localStorage.removeItem('userId');
        setLoading(false);
        return;
      }

      // For MVP: we need the org ID from the response
      // But our API uses org ID, not slug. Let's store what we have.
      login(tempUserId, orgSlug);
      navigate('/overview');
    } catch {
      setError('Login failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Oopuo</h1>
          <p className="text-sm text-gray-500 mt-2">Sign in to your operations dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm space-y-4">
          <div>
            <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
              User ID
            </label>
            <input
              id="userId"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your user ID"
            />
          </div>

          <div>
            <label htmlFor="orgSlug" className="block text-sm font-medium text-gray-700 mb-1">
              Organization ID
            </label>
            <input
              id="orgSlug"
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your organization ID"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
