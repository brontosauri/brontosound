import TypeOrm from "$lib/db";
import { LiveGig, LiveGigStatus, LiveVenue } from "$lib/dbEntities/live";
import { bandAppUrl } from "$lib/misc";
import { requireBandPermission } from "$lib/server/session";
import { Not } from "typeorm";
import type { PageServerLoad } from "./$types";

export const load = (async ({ locals }) => {
  const { band } = requireBandPermission(locals, 'live.read');
  const db = await TypeOrm.getDb();
  const [venueCount, pursuitCount] = await Promise.all([
    db.getRepository(LiveVenue).countBy({ band: { id: band.id } }),
    db.getRepository(LiveGig).countBy({ band: { id: band.id }, status: Not(LiveGigStatus.COMPLETE) }), // as on the Gig pursuit page
  ]);

  return {
    pageTitle: "Live",
    breadcrumb: [{title: "Live", href: bandAppUrl(band.handle, "/live")}],
    venueCount,
    pursuitCount,
  }
}) satisfies PageServerLoad;
