import { instanceToPlain } from "class-transformer"

import { Song, SongFolder } from "$lib/dbEntities/song";
import TypeOrm from "$lib/db";
import { bandAppUrl } from "$lib/misc";
import { songsFolderOf } from "$lib/server/bands";
import { requireBandPermission } from "$lib/server/session";
import type { PageServerLoad } from "./$types";

export const load = (async ({ locals }) => {
  const { band } = requireBandPermission(locals, 'songbook.read');
  const db = await TypeOrm.getDb()
  const [songs, songFolders] = await Promise.all([
    db.getRepository(Song).find({ where: { band: { id: band.id } }, relations: { tags: true } }),
    db.getRepository(SongFolder).findBy({ band: { id: band.id } }),
  ]);

  return {
    // no `pageTitle`: the page renders its own, with actions
    breadcrumb: [{title: "Songbook", href: bandAppUrl(band.handle, "/songbook")}],
    songsFolder: songsFolderOf(band),
    songs: songs.map((song) => instanceToPlain(song)),
    songFolders: songFolders.map((folder) => instanceToPlain(folder)),
    lastCacheSync: songFolders[0]?.syncDate ?? null,
    allTags: [] // TODO: implement
  }
}) satisfies PageServerLoad;
