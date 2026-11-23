import { error, json, type RequestHandler } from '@sveltejs/kit';
import TypeOrm from '$lib/db';
import { Song } from '$lib/dbEntities/song';
import { deleteSongFile, findStoredSong, readSongFile, writeSongFile } from '$lib/server/songFolder';
import type { SongPins } from '$lib/songFiles/songFile';
import { requireBandPermission } from '$lib/server/session';
import { checkUpload } from '$lib/server/quotas';

/** The request's body, if the band's herd storage can take it: checked by its announced size before it's read */
async function upload(band: Parameters<typeof checkUpload>[0], request: Request): Promise<Uint8Array> {
    await checkUpload(band, Number(request.headers.get('content-length')) || 0);
    return new Uint8Array(await request.arrayBuffer());
}

/** Files of the song's folder, addressed by `path` relative to it */
function pathParam(url: URL): string {
    const path = url.searchParams.get('path');
    if (!path) error(400, "Path parameter is required");
    return path;
}

/** Stream a file. With `download`, the browser saves it. */
export const GET = (async ({ params, url, locals }) => {
    const { band } = requireBandPermission(locals, 'songbook.read');
    const path = pathParam(url);
    const song = await findStoredSong(band, params.songId);
    const file = await readSongFile(band, song, path);
    const name = encodeURIComponent(path.split('/').pop()!);
    return new Response(file.stream, {
        headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': String(file.size),
            'Content-Disposition': `${url.searchParams.has('download') ? 'attachment' : 'inline'}; filename*=UTF-8''${name}`,
        },
    });
}) satisfies RequestHandler;

/** Upload a new file, the request body as is: a file already there is a 409 */
export const POST = (async ({ params, url, request, locals }) => {
    const { band } = requireBandPermission(locals, 'songbook.write');
    await writeSongFile(band, await findStoredSong(band, params.songId), pathParam(url), await upload(band, request), false);
    return json({ ok: true });
}) satisfies RequestHandler;

/** Save a file, replacing it */
export const PUT = (async ({ params, url, request, locals }) => {
    const { band } = requireBandPermission(locals, 'songbook.write');
    await writeSongFile(band, await findStoredSong(band, params.songId), pathParam(url), await upload(band, request), true);
    return json({ ok: true });
}) satisfies RequestHandler;

/** Delete a file, and unpin it. Returns the pins. */
export const DELETE = (async ({ params, url, locals }) => {
    const { band } = requireBandPermission(locals, 'songbook.write');
    const path = pathParam(url);
    const song = await findStoredSong(band, params.songId);
    await deleteSongFile(band, song, path);

    const pins: SongPins = {
        pinnedDocument: song.pinnedDocument == path ? null : song.pinnedDocument,
        pinnedAudio: song.pinnedAudio == path ? null : song.pinnedAudio,
    };
    await (await TypeOrm.getDb()).getRepository(Song).update(song.id, pins);
    return json(pins);
}) satisfies RequestHandler;
