import TypeOrm from '$lib/db';
import type { Band } from '$lib/dbEntities/band';
import { Song, SongTag } from '$lib/dbEntities/song';
import { requireBandPermission } from '$lib/server/session';
import { list, text } from '$lib/server/input';
import { findStoredSong } from '$lib/server/songFolder';
import { json, type RequestHandler } from '@sveltejs/kit';

export interface PostTagsRequest {
    tags: string[]
}

/** Set the song's tags, by name */
export const POST = (async ({ request, params, locals }) => {
    const { band } = requireBandPermission(locals, 'songbook.write');
    const song = await findStoredSong(band, params.songId);
    const names = list((await request.json() as PostTagsRequest).tags, 'tags').map(name => text(name, 'tag').trim()).filter(Boolean);
    const tags = names.length ? await bandTags(band, names) : [];
    return json(await (await TypeOrm.getRepository(Song)).save({ id: song.id, tags }));
}) satisfies RequestHandler;

/** The band's tags with these names, created if new */
async function bandTags(band: Band, names: string[]): Promise<SongTag[]> {
    const tags = await TypeOrm.getRepository(SongTag);
    const rows = names.map(name => ({ name, band: { id: band.id } }));
    await tags.createQueryBuilder().insert().values(rows).orIgnore().execute(); // orIgnore: tags the band already has
    return tags.findBy(rows);
}
