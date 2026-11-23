import { syncSongsFolder } from '$lib/server/cachedStorage';
import { requireBandPermission } from '$lib/server/session';
import type { RequestHandler } from '@sveltejs/kit';

/**
 * Sync the songs folder: create it if missing, list its song folders and cache them. POST: it changes state
 */
export const POST = (async ({ locals }) => {
    const { band } = requireBandPermission(locals, 'songbook.read');
    return new Response(JSON.stringify(await syncSongsFolder(band)));
}) satisfies RequestHandler;
