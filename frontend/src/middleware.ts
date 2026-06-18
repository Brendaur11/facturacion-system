import { NextRequest, NextResponse } from 'next/server';

const publicRoutes = ['/login', '/recuperar-contrasena'];
const adminRoutes = ['/admin'];

function decodePayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const decoded = decodePayload(token);
  if (!decoded?.exp) return true;
  return Date.now() / 1000 > (decoded.exp as number);
}

function getTokenRole(token: string): string | null {
  const decoded = decodePayload(token);
  return (decoded?.rol as string) ?? null;
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  const isPublic = publicRoutes.some((r) => pathname === r || pathname.startsWith(r + '/'));

  if (isPublic) {
    if (token) {
      const role = getTokenRole(token);
      const home = role === 'SUPERADMIN' || role === 'ADMIN' ? '/admin' : '/dashboard';
      return NextResponse.redirect(new URL(home, request.url));
    }
    return NextResponse.next();
  }

  if (!token || isTokenExpired(token)) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    return response;
  }

  const isAdminRoute = adminRoutes.some((r) => pathname === r || pathname.startsWith(r + '/'));
  if (isAdminRoute && getTokenRole(token) !== 'SUPERADMIN' && getTokenRole(token) !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
