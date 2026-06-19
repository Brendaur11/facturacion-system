'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  Package,
  Settings,
  LogOut,
  Receipt,
  ShieldCheck,
  Building2,
  UserCircle,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { authService } from '@/services/auth.service';
import { useRouter } from 'next/navigation';
import { User } from '@/types';

const navItems = [
  { href: '/dashboard',      label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/clientes',       label: 'Clientes',        icon: Users           },
  { href: '/facturas',       label: 'Facturas',        icon: FileText        },
  { href: '/productos',      label: 'Productos',       icon: Package         },
  { href: '/configuracion',  label: 'Configuración',   icon: Settings        },
];

const adminNavItems = [
  { href: '/admin',          label: 'Dashboard',       icon: LayoutDashboard, exact: true  },
  { href: '/admin/empresas', label: 'Empresas',        icon: Building2,       exact: false },
  { href: '/admin/usuarios', label: 'Usuarios',        icon: Users,           exact: false },
];

function UserAvatar({ user }: { user: User }) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.nombre}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
      {user.nombre?.charAt(0).toUpperCase()}
    </div>
  );
}

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const load = () => setUser(authService.getStoredUser());
    load();
    window.addEventListener('sessionUpdated', load);
    return () => window.removeEventListener('sessionUpdated', load);
  }, []);

  const isSuperAdmin = user?.rol === 'SUPERADMIN';
  const isAdminOrAbove = user?.rol === 'SUPERADMIN' || user?.rol === 'ADMIN';

  function handleLogout() {
    authService.logout();
    document.cookie = 'token=; path=/; max-age=0';
    router.push('/login');
  }

  return (
    <aside className={cn(
      'fixed inset-y-0 left-0 z-50 md:relative md:inset-auto',
      'w-64 bg-gray-900 text-white flex flex-col h-dvh',
      'transition-transform duration-300',
      mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
    )}>
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
              <Receipt className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">Facturación</span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {isAdminOrAbove ? (
          <>
            <p className="px-3 pt-1 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Administración
            </p>
            {adminNavItems.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              );
            })}
          </>
        ) : (
          navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname.startsWith(href)
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white',
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))
        )}
      </nav>

      <div className="p-4 border-t border-gray-700 space-y-1">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <UserAvatar user={user} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{user.nombre}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
              {isAdminOrAbove && (
                <span className="mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400">
                  <ShieldCheck className="h-3 w-3" /> {isSuperAdmin ? 'Superadmin' : 'Admin'}
                </span>
              )}
            </div>
          </div>
        )}
        <Link
          href="/perfil"
          onClick={onClose}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            pathname === '/perfil'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:bg-gray-800 hover:text-white',
          )}
        >
          <UserCircle className="h-5 w-5" />
          Mi Perfil
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white cursor-pointer transition-colors w-full"
        >
          <LogOut className="h-5 w-5" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
