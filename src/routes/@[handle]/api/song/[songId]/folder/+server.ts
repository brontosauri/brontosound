import { json, type RequestHandler } from '@sveltejs/kit';
import { findStoredSong, listSongFolder } from '$lib/server/songFolder';
import { requireBandPermission } from '$lib/server/session';

/** List a folder in the song's folder: `path` is relative to it, empty for the song folder itself */
export const GET = (async ({ params, url, locals }) => {
    const { band } = requireBandPermission(locals, 'songbook.read');
    const song = await findStoredSong(band, params.songId);
    return json(await listSongFolder(band, song, url.searchParams.get('path') ?? ''));
}) satisfies RequestHandler;
