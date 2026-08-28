import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowLeft, ShieldCheck } from 'lucide-react';
import { setAuth } from '../../lib/auth';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok) {
        setAuth(data.token, data.user);
        navigate('/admin/dashboard');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-4">
      {/* Top Back to Website Link */}
      <div className="max-w-md w-full mb-3 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-stone-400 hover:text-white text-sm font-semibold transition-colors group px-3 py-1.5 rounded-lg hover:bg-stone-800/60"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1 text-emerald-400" />
          <span>Back to Website</span>
        </Link>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-stone-500">Chiltan Admin</span>
      </div>

      <div className="max-w-md w-full bg-stone-50 rounded-2xl shadow-2xl overflow-hidden border border-stone-800">
        <div className="bg-stone-900 py-8 px-6 text-center border-b border-stone-800 flex flex-col items-center">
          <img src="/logo/chiltan-adventures-icon-white.svg" alt="CHILTAN ADVENTURES" className="h-16 w-auto mb-4 drop-shadow-lg object-contain" />
          <h1 className="text-xl font-extrabold text-white tracking-[0.15em] uppercase">CHILTAN ADVENTURES</h1>
          <p className="text-stone-400 text-xs mt-1 font-semibold tracking-[0.25em] uppercase">Admin Management Portal</p>
        </div>
        
        <div className="p-8">
          <div className="mb-6 p-3.5 bg-stone-100/90 border border-stone-200 rounded-xl flex items-center gap-3 text-stone-600">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-xs font-medium">
              Authorized admin access only. Please sign in with your administrator credentials.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-100 border border-red-300 text-red-700 text-sm rounded-lg text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-stone-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white text-stone-900"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-stone-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white text-stone-900"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-70 mt-4 shadow-md cursor-pointer"
            >
              {loading ? 'Authenticating...' : 'Secure Login'}
            </button>
          </form>
          
          <div className="mt-6 pt-5 border-t border-stone-200/80 flex items-center justify-between text-xs text-stone-500">
            <Link 
              to="/" 
              className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-semibold hover:underline transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Website</span>
            </Link>
            <span>Authorized access only</span>
          </div>
        </div>
      </div>
    </div>
  );
}
