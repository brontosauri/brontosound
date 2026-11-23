import TypeOrm from "$lib/db";
import { SongTag } from "$lib/dbEntities/song";
import { bandAppUrl } from "$lib/misc";
import { requireBandPermission } from "$lib/server/session";
import { findStoredSong } from "$lib/server/songFolder";
import { instanceToPlain } from "class-transformer";
import type { LayoutServerLoad } from "./$types";

export const load = (async ({ params, locals }) => {
  const { band } = requireBandPermission(locals, 'songbook.read');
  const storedSong = await findStoredSong(band, params.songId);
  const allTags = await (await TypeOrm.getRepository(SongTag)).findBy({ band: { id: band.id } });

  const songbook = bandAppUrl(band.handle, "/songbook");
  return {
    pageTitle: `Song: ${storedSong.title}`,
    breadcrumb: [
        {title: "Songbook", href: songbook},
        {title: storedSong.title, href: `${songbook}/${params.songId}/${params.songSlug}`},
    ],
    song: instanceToPlain(storedSong),
    allTags: allTags.map((v) => v.name),
  }
}) satisfies LayoutServerLoad;
