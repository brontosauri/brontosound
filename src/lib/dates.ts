import { page } from '$app/state';

// Dates as the signed-in person reads them: in their language, else the herd's (the root layout's `locale`).
// For components, while they render or in the browser

const localeOf = () => page.data.locale as string | undefined;

export function formatDate(date: Date | string | null | undefined): string {
    return date ? new Date(date).toLocaleDateString(localeOf()) : '—';
}

export function formatDateTime(date: Date | string): string {
    return new Date(date).toLocaleString(localeOf(), { dateStyle: 'short', timeStyle: 'short' });
}
