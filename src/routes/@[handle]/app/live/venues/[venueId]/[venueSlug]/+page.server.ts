import { error } from "@sveltejs/kit";
import TypeOrm from "$lib/db";
import { LiveGig, LiveVenue } from "$lib/dbEntities/live";
import { bandAppUrl } from "$lib/misc";
import { requireBandPermission } from '$lib/server/session';
import { gigInput } from '$lib/server/liveInput';
import { parseJson } from '$lib/server/input';
import { instanceToPlain } from "class-transformer";
import type { Actions, PageServerLoad } from './$types';

export const load = (async ({ params, locals }) => {
  const { band } = requireBandPermission(locals, 'live.read');
  const venue = await (await TypeOrm.getRepository(LiveVenue)).findOne({
    where: { id: parseInt(params.venueId), band: { id: band.id } },
    relations: { gigs: true },
  });
  if (!venue) error(404, "Venue not found");

  const venues = bandAppUrl(band.handle, "/live/venues");
  return {
    pageTitle: "Venue: " + venue.name,
    breadcrumb: [{title: "Live", href: bandAppUrl(band.handle, "/live")}, {title: "Venues", href: venues}, {title: venue.name, href: `${venues}/${params.venueId}/${params.venueSlug}`}],
    venue: instanceToPlain(venue),
  }
}) satisfies PageServerLoad;

export const actions = {
    saveNewGig: async ({request, locals}) => {
        const { user, band } = requireBandPermission(locals, 'live.write');
        const data = await request.formData();
        const newGig = await gigInput(parseJson(data.get("newGigJson"), "newGigJson"), user, band, { create: true });
        const savedGig = await (await TypeOrm.getRepository(LiveGig)).save(newGig);
        return {
            success: true,
            savedGig: JSON.stringify(instanceToPlain(savedGig)),
        }
    },
} satisfies Actions;
