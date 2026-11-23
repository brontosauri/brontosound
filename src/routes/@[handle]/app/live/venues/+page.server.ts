import TypeOrm from "$lib/db";
import { LiveVenue } from "$lib/dbEntities/live";
import { bandAppUrl } from "$lib/misc";
import { requireBandPermission } from "$lib/server/session";
import { instanceToPlain } from "class-transformer";
import type { PageServerLoad } from "./$types";

export const load = (async ({ locals }) => {
  const { band } = requireBandPermission(locals, 'live.read');
  const venues = await (await TypeOrm.getRepository(LiveVenue)).findBy({ band: { id: band.id } });

  return {
    pageTitle: "Venues",
    breadcrumb: [{title: "Live", href: bandAppUrl(band.handle, "/live")}, {title: "Venues", href: bandAppUrl(band.handle, "/live/venues")}],
    venues: venues.map((venue) => instanceToPlain(venue)),
  }
}) satisfies PageServerLoad;
