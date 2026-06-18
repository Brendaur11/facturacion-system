import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { EstadoFactura } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
}

export function formatDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR');
}

export function estadoBadgeVariant(estado: EstadoFactura): 'default' | 'secondary' | 'destructive' | 'outline' {
  const map: Record<EstadoFactura, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    BORRADOR: 'secondary',
    EMITIDA: 'default',
    PAGADA: 'outline',
    ANULADA: 'destructive',
  };
  return map[estado] ?? 'secondary';
}
