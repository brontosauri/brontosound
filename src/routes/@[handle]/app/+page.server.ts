import TypeOrm from "$lib/db";
import { LiveGig, LiveGigStatus, LiveVenue } from "$lib/dbEntities/live";
import { Song, SongFolder, SongTag } from "$lib/dbEntities/song";
import { buildGigUrl } from "$lib/misc";
import { requireBandPermission } from "$lib/server/session";
import { reconcileSongs } from "$lib/songbook";
import { MoreThanOrEqual, Not } from "typeorm";
import type { PageServerLoad } from "./$types";

export const load = (async ({ locals }) => {
  const { band } = requireBandPermission(locals, 'band.read');
  const ofBand = { band: { id: band.id } };
  const db = await TypeOrm.getDb();
  const [songs, songDirs, tagCount, venueCount, pursuitCount, upcomingGigs] = await Promise.all([
    db.getRepository(Song).findBy(ofBand),
    db.getRepository(SongFolder).findBy(ofBand),
    db.getRepository(SongTag).countBy(ofBand),
    db.getRepository(LiveVenue).countBy(ofBand),
    db.getRepository(LiveGig).countBy({ ...ofBand, status: Not(LiveGigStatus.COMPLETE) }), // as on the Gig pursuit page
    db.getRepository(LiveGig).find({
      where: { ...ofBand, status: LiveGigStatus.CONFIRMED, date: MoreThanOrEqual(new Date()) },
      order: { date: 'ASC' },
      relations: { venue: true },
    }),
  ]);

  const { existing, newDirs } = reconcileSongs(songs, songDirs);
  const lastAdded = existing.reduce<Date | null>((last, song) => !last || song.creationDate > last ? song.creationDate : last, null);
  const nextGig = upcomingGigs[0];

  return {
    pageTitle: "Dashboard",
    breadcrumb: [],
    songbook: { songCount: existing.length, tagCount, lastAdded, newSongCount: newDirs.length },
    live: {
      venueCount,
      pursuitCount,
      upcomingGigCount: upcomingGigs.length,
      nextGig: nextGig?.venue && { venueName: nextGig.venue.name, date: nextGig.date, url: buildGigUrl(band.handle, nextGig, nextGig.venue) },
    },
  };
}) satisfies PageServerLoad;
