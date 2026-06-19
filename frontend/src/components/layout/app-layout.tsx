'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './sidebar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="md:hidden flex items-center h-14 px-4 bg-white border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-2 font-semibold text-gray-900">Facturación</span>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
