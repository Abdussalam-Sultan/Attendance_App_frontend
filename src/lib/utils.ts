import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function getNormalizedUrl(url: string): string {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  if (backendUrl && url.startsWith('/api')) {
    const pathWithoutApi = url.replace(/^\/api/, '');
    return `${backendUrl.replace(/\/$/, '')}${pathWithoutApi.startsWith('/') ? pathWithoutApi : `/${pathWithoutApi}`}`;
  }
  return url;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | undefined | null) {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

export function formatTime(date: Date | string | undefined | null) {
  if (!date) return '--:--';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '--:--';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}
