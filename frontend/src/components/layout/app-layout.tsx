'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Menu } from 'lucide-react';
import { Sidebar } from './sidebar';
import { authService } from '@/services/auth.service';

const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutos
const WARN_MS = 60 * 1000;            // aviso 1 minuto antes

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnToastId = useRef<string | number | null>(null);

  useEffect(() => {
    function doLogout() {
      authService.logout();
      document.cookie = 'token=; path=/; max-age=0';
      router.push('/login');
    }

    function resetTimers() {
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
      if (warnTimer.current)  clearTimeout(warnTimer.current);
      if (warnToastId.current !== null) toast.dismiss(warnToastId.current);

      warnTimer.current = setTimeout(() => {
        warnToastId.current = toast.warning(
          'Tu sesión cerrará en 1 minuto por inactividad',
          { duration: WARN_MS },
        );
      }, INACTIVITY_MS - WARN_MS);

      logoutTimer.current = setTimeout(doLogout, INACTIVITY_MS);
    }

    const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    EVENTS.forEach((e) => window.addEventListener(e, resetTimers, { passive: true }));
    resetTimers();

    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, resetTimers));
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
      if (warnTimer.current)  clearTimeout(warnTimer.current);
    };
  }, [router]);

  return (
    <div className="flex h-dvh bg-gray-50">
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
