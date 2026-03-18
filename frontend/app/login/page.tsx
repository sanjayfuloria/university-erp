'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setAuth } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@university.edu');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login(email, password);
      setAuth(res.access_token, res.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-950 text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-800/20 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-brand-700/15 rounded-full translate-y-1/3 -translate-x-1/3" />
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-brand-600/10 rounded-full -translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 1.1.9 2 2 2h8a2 2 0 002-2v-5" />
              </svg>
            </div>
            <span className="text-lg font-medium tracking-wide opacity-90">University ERP</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 style={{ fontFamily: 'var(--font-display)' }} className="text-5xl leading-tight font-light">
            Admissions<br />
            <span className="font-semibold italic">Management</span><br />
            System
          </h1>
          <p className="text-brand-200 text-lg max-w-md leading-relaxed">
            End-to-end lifecycle management from pre-admission inquiries through alumni engagement.
          </p>
        </div>

        <div className="relative z-10 text-brand-300 text-sm">
          <p>Designed for Indian Universities</p>
          <p className="opacity-60 mt-1">FastAPI + Next.js + PostgreSQL</p>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <h1 style={{ fontFamily: 'var(--font-display)' }} className="text-3xl font-semibold text-brand-950">University ERP</h1>
            <p className="text-gray-500 mt-1">Admissions Management System</p>
          </div>

          <div className="mb-8">
            <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-2xl font-semibold text-gray-900">Sign in</h2>
            <p className="text-gray-500 mt-1 text-sm">Enter your credentials to access the dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field"
                placeholder="admin@university.edu"
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 p-4 bg-surface-50 rounded-xl border border-surface-200">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Demo Credentials</p>
            <div className="space-y-2 text-sm">
              {[
                { role: 'Super Admin', email: 'admin@university.edu', pwd: 'admin123' },
                { role: 'Dean', email: 'dean@university.edu', pwd: 'dean123' },
                { role: 'Faculty', email: 'faculty@university.edu', pwd: 'faculty123' },
              ].map(c => (
                <button
                  key={c.email}
                  type="button"
                  onClick={() => { setEmail(c.email); setPassword(c.pwd); }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white transition-colors text-left group"
                >
                  <div>
                    <span className="font-medium text-gray-700">{c.role}</span>
                    <span className="text-gray-400 ml-2">{c.email}</span>
                  </div>
                  <span className="text-brand-600 opacity-0 group-hover:opacity-100 text-xs transition-opacity">Use</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
