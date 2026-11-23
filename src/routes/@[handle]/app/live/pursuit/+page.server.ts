import TypeOrm from "$lib/db";
import { LiveGig, LiveGigStatus } from "$lib/dbEntities/live";
import { bandAppUrl } from "$lib/misc";
import { requireBandPermission } from "$lib/server/session";
import { instanceToPlain } from "class-transformer";
import { Not } from "typeorm";
import type { PageServerLoad } from "./$types";

export const load = (async ({ locals }) => {
  const { band } = requireBandPermission(locals, 'live.read');
  const pursuitGigs = await (await TypeOrm.getRepository(LiveGig)).find({
    where: { band: { id: band.id }, status: Not(LiveGigStatus.COMPLETE) },
    relations: { venue: true, interactions: true },
  });

  return {
    pageTitle: "Gig pursuit",
    breadcrumb: [{title: "Live", href: bandAppUrl(band.handle, "/live")}, {title: "Gig pursuit", href: bandAppUrl(band.handle, "/live/pursuit")}],
    pursuitGigs: pursuitGigs.map((gig) => instanceToPlain(gig)),
  }
}) satisfies PageServerLoad;
