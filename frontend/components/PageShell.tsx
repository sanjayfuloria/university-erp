'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, User } from '@/lib/api';
import Sidebar from './Sidebar';

export default function PageShell({
  children,
  title,
  subtitle,
  action,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const u = getUser();
    if (!u) {
      router.push('/login');
      return;
    }
    setUser(u);
  }, [router]);

  if (!mounted || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-brand-700">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <Sidebar />
      <main className="ml-64">
        <header className="sticky top-0 z-20 bg-surface-50/80 backdrop-blur-md border-b border-surface-200 px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)' }} className="text-2xl font-semibold text-gray-900">{title}</h1>
              {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            {action}
          </div>
        </header>
        <div className="px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
