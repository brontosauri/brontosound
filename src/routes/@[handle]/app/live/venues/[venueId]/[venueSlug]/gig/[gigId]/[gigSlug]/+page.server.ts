import { error } from "@sveltejs/kit";
import TypeOrm from "$lib/db";
import { LiveGig, LiveGigInteraction } from "$lib/dbEntities/live";
import { bandAppUrl } from "$lib/misc";
import { requireBandPermission } from '$lib/server/session';
import { interactionInput } from '$lib/server/liveInput';
import { parseJson } from '$lib/server/input';
import { instanceToPlain } from "class-transformer";
import type { Actions, PageServerLoad } from './$types';

export const load = (async ({ params, locals }) => {
  const { band } = requireBandPermission(locals, 'live.read');
  const gig = await (await TypeOrm.getRepository(LiveGig)).findOne({
    where: { id: parseInt(params.gigId), band: { id: band.id } },
    relations: { venue: true, interactions: { createdBy: true } },
  });
  if (!gig) error(404, "Gig not found");

  const venue = bandAppUrl(band.handle, `/live/venues/${params.venueId}/${params.venueSlug}`);
  return {
    pageTitle: "Gig: " + gig.name,
    breadcrumb: [
      {title: "Live", href: bandAppUrl(band.handle, "/live")},
      {title: "Venues", href: bandAppUrl(band.handle, "/live/venues")},
      {title: gig.venue.name, href: venue},
      {title: `Gig: ${gig.name}`, href: venue}
    ],
    gig: instanceToPlain(gig),
  }
}) satisfies PageServerLoad;

export const actions = {
    saveNewInteraction: async ({request, locals}) => {
        const { user, band } = requireBandPermission(locals, 'live.write');
        const data = await request.formData();
        const newInteraction = await interactionInput(parseJson(data.get("newInteractionJson"), "newInteractionJson"), user, band);
        const savedInteraction = await (await TypeOrm.getRepository(LiveGigInteraction)).save(newInteraction);
        return {
            success: true,
            savedInteraction: JSON.stringify(instanceToPlain(savedInteraction)),
        }
    },
} satisfies Actions;
