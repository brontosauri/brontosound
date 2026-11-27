import { isConfigured, instanceConfig } from '$lib/server/instanceConfig';
import { checkAuthSecret } from '$lib/server/authSecret';
import { loadHerdSettings } from '$lib/server/herdSettings';
import { ensureDefaultAdmin } from '$lib/server/users';
import { anonymiseRemovedUsers } from '$lib/server/userAdmin';
import setupPageHtml from './setupPage.html?raw';

let started: Promise<void> | null = null;

/** Whether `npm run init` has created config/config.json and the data folder. The first time it has, readies the app. */
export async function isSetUp(): Promise<boolean> {
    if (!started && isConfigured()) {
        started = start();
    }
    await started;
    return !!started;
}

async function start(): Promise<void> {
    checkAuthSecret(instanceConfig().authSecret);
    await loadHerdSettings();
    await ensureDefaultAdmin();
    await anonymiseRemovedUsers();
}

/** What every request gets until then: how to set up */
export function setupPage(): Response {
    return new Response(setupPageHtml, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
